import { getPublicPageConfig } from '@/config/public-page-config';
import type { ContentLocale } from '@/lib/content/types';

import { getCoursePhotoKey } from './course-profiles';

/**
 * ONE PHOTOGRAPH PER COURSE, RESOLVED FROM THE COURSE.
 *
 * Both the homepage and the course index used to pick a card photograph by
 * ARRAY POSITION:
 *
 *     const photo = coursePhotos[index % coursePhotos.length];
 *
 * The list being indexed was sorted by `lessons_per_week`, so a course's
 * photograph was really a property of its RANK. Three things followed, all
 * observed on the running site rather than reasoned about:
 *
 *   1. FILTERING RESHUFFLED THE PHOTOGRAPHS. On /courses, Intensive German
 *      carried `group-classroom-teacher-activity.jpg`; on /courses?goal=exam
 *      the same photograph sat on Special Courses, because Special Courses had
 *      moved into position 0.
 *   2. THE TWO RUNTIME MODES DISAGREED. Neon and the in-repo fixtures assign
 *      different `lessons_per_week`, so the same course ranked differently and
 *      got a different photograph depending on whether DATABASE_URL was set.
 *      Two courses also tie at 8 lessons/week in the seed with no secondary
 *      sort, making that pair's photographs genuinely undefined.
 *   3. ONE COURSE HAD THREE FACES. Intensive German showed
 *      `course-classroom-circle.jpg` on the homepage, `course-classroom-wide.jpg`
 *      on the index, and `group-classroom-teacher-activity.jpg` on its own page.
 *      A visitor clicking a card never landed on the photograph they clicked.
 *
 * The binding already existed — `courseProfiles[slug].photoKey`, which the
 * detail page has always used for its hero. It simply was not used anywhere
 * else. This helper is that lookup, so the card, the homepage row and the
 * detail hero are the same photograph by construction rather than by anyone
 * remembering to keep three lists in step.
 *
 * Takes the CONTENT slug (`evening-german`), not the route slug
 * (`evening-course`) — `courseProfiles` and `getCoursePhotoKey` are keyed that
 * way, and `course.slug` from the repository is already the content slug.
 */
export function getCoursePhoto(slug: string, locale: ContentLocale) {
  const photos = getPublicPageConfig('course-detail', locale).photos;

  return photos[getCoursePhotoKey(slug)] ?? photos.supportCard;
}
