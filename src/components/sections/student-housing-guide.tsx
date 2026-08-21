'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

/*
 * No `icon`.
 *
 * These four accordion triggers carried emoji glued to the heading text —
 * "\ud83c\udfe0Shared flat (WG) life", "\u267b\ufe0fWaste separation & recycling",
 * "\ud83c\udf2c\ufe0fHeating & ventilation (Sto\u00dfl\u00fcften)", "\ud83d\uddddCheck-in & key handover" — which is
 * both a convention break (CLAUDE.md: icons come from lucide-react via
 * config/icon-map.ts) and an accessibility oddity, since an emoji inside a
 * heading is read out by some screen readers as its CLDR name.
 *
 * They are not replaced with lucide icons either. The adapter behind the
 * `lucide-react` alias exports 113 icons and none of them means "ventilation" —
 * the closest candidates are Settings and Activity. Forcing a wrong icon is
 * worse than no icon, and four short titles in an accordion do not need a mark
 * to be scannable.
 */
type HousingTopic = {
  id: string;
  title: string;
  body: string;
};

function getTopics(locale: ContentLocale): HousingTopic[] {
  if (locale === 'de') {
    return [
      {
        id: 'wg-life',
        title: 'Leben in der WG',
        body: 'In einer Wohngemeinschaft (WG) teilen Sie Küche, Bad und Gemeinschaftsräume mit Mitbewohnenden. Die Nachtruhe gilt in Deutschland typischerweise von 22:00 bis 07:00 Uhr – bitte achten Sie auf Ihre Zimmernachbarn. Ein gemeinsam erstellter Putzplan (Reinigungsplan für Gemeinschaftsbereiche) erleichtert das Miteinander und sorgt für eine angenehme Atmosphäre.',
      },
      {
        id: 'waste',
        title: 'Mülltrennung & Recycling',
        body: 'In Deutschland wird Müll strikt getrennt: Plastik und Verpackungen kommen in den Gelben Sack (oder die Gelbe Tonne), Papier in die blaue Tonne, Bioabfälle (Essensreste, Gemüseschalen) in die braune Biotonne und restlicher Abfall in die schwarze Restmülltonne. Falsch entsorgter Müll kann zu Strafen führen.',
      },
      {
        id: 'heating',
        title: 'Heizen & Lüften (Stoßlüften)',
        body: 'Deutsches Klima erfordert richtiges Lüften, um Schimmel zu vermeiden. Die empfohlene Methode ist Stoßlüften: Öffnen Sie die Fenster 5–10 Minuten weit auf, anstatt sie den ganzen Tag auf Kipp zu lassen. Schalten Sie dabei die Heizung aus oder drehen Sie den Thermostat herunter. Dieses kurze, intensive Lüften tauscht die Luft effektiv aus und verhindert Feuchteschäden.',
      },
      {
        id: 'checkin',
        title: 'Einzug & Schlüsselübergabe',
        body: 'Beim Einzug erhalten Sie Ihre Schlüssel und füllen gemeinsam mit der Unterkunft ein Zimmerübergabeprotokoll aus. Dieses Dokument hält den Zustand des Zimmers bei Ihrer Ankunft fest (Kratzer, Mängel, Einrichtung). Bewahren Sie eine Kopie sorgfältig auf – es schützt Sie bei Ihrem Auszug vor ungerechtfertigten Schadensersatzforderungen.',
      },
    ];
  }

  return [
    {
      id: 'wg-life',
      title: 'Shared flat (WG) life',
      body: 'In a shared flat (Wohngemeinschaft / WG) you share the kitchen, bathroom, and common areas with flatmates. Quiet hours (Nachtruhe) in Germany typically run from 22:00 to 07:00 — please be mindful of your neighbours. A shared cleaning schedule (Putzplan) covering common areas makes communal living comfortable and fair for everyone.',
    },
    {
      id: 'waste',
      title: 'Waste separation & recycling',
      body: 'Germany separates waste strictly. Plastics and packaging go into the Gelber Sack or yellow bin, paper into the blue bin, food scraps and vegetable peelings into the brown organic bin (Biotonne), and remaining household waste into the black Restmüll bin. Incorrect disposal can result in fines, so check the labels carefully.',
    },
    {
      id: 'heating',
      title: 'Heating & ventilation (Stoßlüften)',
      body: 'Germany\'s climate requires proper ventilation to prevent mould. The recommended method is Stoßlüften (shock ventilation): open windows fully for 5–10 minutes rather than leaving them on tilt all day. Turn the radiator thermostat down or off while ventilating. This short, intensive air exchange effectively refreshes the room without losing heat unnecessarily.',
    },
    {
      id: 'checkin',
      title: 'Check-in & key handover',
      body: 'On arrival you will receive your keys and complete a Zimmerübergabeprotokoll (room condition protocol) together with the accommodation. This document records the state of the room at the moment you move in — note any scratches, defects, or missing items. Keep your copy carefully. It protects you against unjustified damage claims when you move out.',
    },
  ];
}

type StudentHousingGuideProps = {
  locale: ContentLocale;
  className?: string;
};

export function StudentHousingGuide({ locale, className }: StudentHousingGuideProps) {
  const topics = getTopics(locale);

  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Unterkunft & Alltag',
          title: 'Praktischer Leitfaden fürs Wohnen in Deutschland',
          description:
            'Alles, was Sie als internationale Studierende über das Zusammenleben in deutschen WGs wissen müssen.',
        }
      : {
          eyebrow: 'Accommodation & daily life',
          title: 'Practical guide to living in Germany',
          description:
            'Everything international students need to know about day-to-day life in a German shared flat.',
        };

  return (
    <section
      className={cn(
        'rounded-xl bg-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)] sm:p-8',
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
        {copy.eyebrow}
      </p>
      <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
      <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{copy.title}</h2>
      <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{copy.description}</p>

      {/*
        No box of its own. The accordion sat in a bordered, rounded container
        INSIDE this section's own bordered card — a card in a card, which is the
        nesting removed from the course pages. Its own dividers already separate
        the rows, so the outer rule was doing nothing the inner ones weren't.
      */}
      <Accordion type="multiple" className="mt-8 divide-y divide-[color:var(--casa-sand)]/70 border-t border-[color:var(--casa-sand)]">
        {topics.map((topic) => (
          <AccordionItem key={topic.id} value={topic.id} className="border-b-0 bg-[var(--casa-surface-wash)] px-5 hover:bg-[var(--casa-canvas)] transition-colors duration-200">
            <AccordionTrigger className="py-4 text-base font-semibold text-[var(--casa-ink)] hover:no-underline">
              <span>{topic.title}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pt-0">
              <p className="text-sm leading-relaxed text-[var(--casa-muted)]">{topic.body}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
