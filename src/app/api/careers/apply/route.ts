import { NextResponse } from 'next/server';

import { normalizeContentLocale } from '@/lib/content/locale';
import { getDb } from '@/lib/db/server';
import { isDatabaseConfigured } from '@/lib/db/env';
import { careerApplicationSchema } from '@/lib/validation/career-applications';

const MAX_CV_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8000;

const acceptedCvMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function successMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Vielen Dank. Ihre Bewerbung ist eingegangen. Das CASA-Team meldet sich zeitnah.';
  }

  return 'Thank you. Your application has been received. The CASA team will get back to you shortly.';
}

function failureMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Ihre Bewerbung konnte gerade nicht übermittelt werden. Bitte versuchen Sie es erneut oder nutzen Sie das Kontaktformular.';
  }

  return 'Your application could not be submitted right now. Please try again or use the contact form.';
}

function invalidCvMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Bitte laden Sie Ihren Lebenslauf als PDF, DOC oder DOCX hoch (max. 8 MB).';
  }

  return 'Please upload your resume as PDF, DOC, or DOCX (max 8 MB).';
}

function storageUnavailableMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Bewerbungen sind gerade kurzzeitig nicht verfügbar. Bitte kontaktieren Sie CASA direkt, während der Lebenslauf-Upload neu aktiviert wird.';
  }

  return 'Applications are temporarily unavailable. Please contact CASA directly while CV upload storage is being restored.';
}

function extractLocale(value: FormDataEntryValue | null): 'en' | 'de' {
  return normalizeContentLocale(typeof value === 'string' ? value : 'en');
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Invalid request payload.',
      },
      { status: 400 }
    );
  }

  const locale = extractLocale(formData.get('locale'));
  const cvFile = formData.get('cvFile');

  if (!(cvFile instanceof File) || cvFile.size <= 0) {
    return NextResponse.json(
      {
        status: 'error',
        message: invalidCvMessage(locale),
      },
      { status: 400 }
    );
  }

  if (cvFile.size > MAX_CV_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        status: 'error',
        message: invalidCvMessage(locale),
      },
      { status: 400 }
    );
  }

  if (cvFile.type && !acceptedCvMimeTypes.has(cvFile.type)) {
    return NextResponse.json(
      {
        status: 'error',
        message: invalidCvMessage(locale),
      },
      { status: 400 }
    );
  }

  const payload = {
    positionId: formData.get('positionId'),
    positionSlug: formData.get('positionSlug'),
    positionTitle: formData.get('positionTitle'),
    locale,
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    linkedinUrl: formData.get('linkedinUrl'),
    coverLetter: formData.get('coverLetter'),
  };

  const parsed = careerApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        status: 'error',
        message: firstIssue?.message ?? failureMessage(locale),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const requestId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const webHookUrl = process.env.CAREERS_APPLICATION_WEBHOOK_URL;
  const databaseConfigured = isDatabaseConfigured();

  if (!databaseConfigured) {
    console.error('[careers-apply-api] submission blocked because DATABASE_URL is not configured');
    return NextResponse.json(
      {
        status: 'error',
        message: storageUnavailableMessage(locale),
        supportPath: '/contact?topic=careers',
      },
      { status: 503 }
    );
  }

  try {
    const db = getDb();
    if (!db) {
      throw new Error('Database is not available');
    }

    const cvBytes = Buffer.from(await cvFile.arrayBuffer());

    await db.transaction([
      db`
        INSERT INTO career_applications (
          id,
          career_position_id,
          position_slug,
          position_title,
          locale,
          first_name,
          last_name,
          email,
          phone,
          linkedin_url,
          cover_letter,
          cv_file_name,
          cv_file_size,
          cv_mime_type,
          cv_storage_path,
          source
        )
        VALUES (
          ${requestId}::uuid,
          ${data.positionId || null}::uuid,
          ${data.positionSlug},
          ${data.positionTitle},
          ${data.locale},
          ${data.firstName},
          ${data.lastName},
          ${data.email},
          ${data.phone || null},
          ${data.linkedinUrl || null},
          ${data.coverLetter},
          ${cvFile.name},
          ${cvFile.size},
          ${cvFile.type || null},
          ${null},
          'careers-page'
        )
      `,
      db`
        INSERT INTO career_application_files (
          career_application_id,
          file_name,
          file_size,
          mime_type,
          file_bytes
        )
        VALUES (
          ${requestId}::uuid,
          ${cvFile.name},
          ${cvFile.size},
          ${cvFile.type || null},
          ${cvBytes}
        )
      `,
    ]);
  } catch (error) {
    console.error('[careers-apply-api] submission failed', error);
    return NextResponse.json(
      {
        status: 'error',
        message: failureMessage(locale),
        supportPath: '/contact?topic=careers',
      },
      { status: 502 }
    );
  }

  if (webHookUrl) {
    try {
      const response = await fetch(webHookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          submittedAt,
          locale: data.locale,
          positionId: data.positionId || null,
          positionSlug: data.positionSlug,
          positionTitle: data.positionTitle,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          linkedinUrl: data.linkedinUrl || null,
          coverLetter: data.coverLetter,
          cvFileName: cvFile.name,
          cvFileSize: cvFile.size,
          cvMimeType: cvFile.type || null,
          cvStoragePath: null,
          cvStorageMode: 'database',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Webhook rejected career application with status ${response.status}`);
      }
    } catch (error) {
      console.error('[careers-apply-api] webhook failed', error);
      return NextResponse.json(
        {
          status: 'error',
          message: failureMessage(locale),
          supportPath: '/contact?topic=careers',
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    status: 'accepted',
    requestId,
    mode: 'database',
    message: successMessage(locale),
  });
}
