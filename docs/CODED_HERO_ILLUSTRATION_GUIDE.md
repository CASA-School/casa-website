# Coded hero illustration guide

Research and art direction for the coded heroes, the pictures drawn in SVG code and ported from
CASA's promo film. The first part applies to every coded hero. The rest is the redraw spec for the Bremen street on
`/unterkunft` (`src/components/sections/accommodation-street.tsx`).

Written 2026-10-08 (research pass, no component edits). Conventions:

- **Units.** Street scale is the component's own: `M = 10` viewBox units per metre, front elevation,
  `GROUND = 392`, viewBox `720 × 480`. A landmark further off gets its own scale factor `k` (units per metre),
  and every dimension it has is `metres × k`. The scale is never stretched non-uniformly.
- **[Sn]** points to the source list at the end. Every number has a source or a tag.
- **DERIVED** means the value is calculated from sourced numbers, and the calculation is shown.
- **ASSUMPTION** means the value is not verifiable from the sources found. It is a starting value to check against
  a photograph or a survey drawing before it counts as fact (CLAUDE.md: mark it, never invent it).

---

## 0. The short version: what is wrong today and what changes

| # | Today | Why it is wrong | Change |
|---|---|---|---|
| 1 | Dom: towers 24 u wide, shafts to y 180, spires plain 2:1 triangles, 16 u apart, a small gable between them at y 226–236 | Shaft is 8.8 tower widths tall; the real shaft is 5.2. The helm above it is 2.0 widths; the real one is 3.1, and it is a **Rhenish helm**: a gable on each face with four rhombic roof faces, not a pyramid. The gap is 0.67 tower widths; the real gap is about 1.36. At the far scale, the in-between gable sits at about 66 m, where the real Dom has open air: a 15 m rope bridge was hung between the towers at 65 m in 2009 [S1][S3][S4] | Redraw at `k = 2.5` with true proportions and Rhenish helms. Put the clock in the **left (north) tower's** gable. Delete the in-between gable (§3.2) |
| 2 | Mill: a trapezoid body 152 u tall under 88 u sails, a curved cap, four sails each drawn from the hub out | The body is 1.7 sail diameters tall; for a 24 m rotor the hub sits at about 1.1 diameters (DERIVED). There is **no gallery**, and the gallery is what makes it a Galerieholländer. There are no octagon arrises and no line between brick and timber. The stocks do not run through the hub [S8][S9][S11] | Redraw at `k = 5` as brick octagon, wooden gallery, wooden octagon, cap, and two stocks through the hub with shuttered sail frames (§3.3) |
| 3 | The sails turn clockwise (`rotate(360deg)`), with the lattice on the right of the upward sail | With that lattice side, the sail moves backwards. Dutch-type mills are normally right-handed, turning **anticlockwise** seen from the front, so the lattice trails [S12][S13][S14] | Keyframe to `rotate(-360deg)`, keep the lattice on the right of the upward sail |
| 4 | `bell` gable: an S-curve into a neck with a round head | That outline is the Dutch *klokgevel* (general architectural knowledge, not sourced here). None of the Bremen references in this guide (Rathaus, Stadtwaage, Schütting) has one. Bremen's showpiece gables are Weser Renaissance stepped-and-scrolled gables: stages divided by cornices, with obelisks on the step ends [S25][S26][S29] | Replace with a two-stage **volute gable** (Volutengiebel) built inside the same 55° envelope (§3.5) |
| 5 | Host family: an 11.6 m detached house with eaves overhang, porch, round-headed door and a 55° gable to the street | That is a suburban type. Bremen's own family house, the **Bremer Haus**, is eaves-side to the street with a roof of about 27°. It has 2–3 storeys over a Souterrain sunk 1–2 m, reached by an external stair [S19] | A mirrored pair of Bremer Häuser, with the host link on one of them (§3.6) |
| 6 | Windows 1.2 × 1.6 m (3:4) on every historic house, no glazing bars; gable windows float | Historic windows stand at about 1:2 (0.9–1.2 m wide, 1.8–2.4 m tall). Until about 1900 they were mostly four-light, with the transom at one third [S20][S23][S24]. Gable windows belong to loft floors | Old houses: 1.0 × 1.8 m with a mullion and a transom at ⅓. Gable windows sit on loft floor lines (§3.4) |
| 7 | Every stroke is 2.0 (the far layer 1.6) | There are no depth tiers, so the far layer reads only through opacity [S32][S34] | Four stroke tiers, plus thinner far strokes (§1.2 R1) |
| 8 | Star at `[690, 150]` | It sits 8 u from the new Dom vane | Move it to `[706, 118]` |

Kept as is, because it is right: the 10 u = 1 m scale, the stepped-gable rule (every step's inner corner on the
roof line, so the gable hides the roof [S30]), the parapet block for the CASA flat, the tram, lamp and tree heights,
and `r2()` rounding.

---

## 1. Line-illustration craft

### 1.1 Who we learn from, and what each one teaches

| Designer / work | What it teaches this drawing |
|---|---|
| **Hergé and the *ligne claire*** (the name was coined by Joost Swarte in 1977; later practitioners include Edgar P. Jacobs, Yves Chaland and Chris Ware) [S31] | Clean outlines with **no hatching**, flat colour and low contrast, so forms are not built up with shading. Our houses already work this way: white contour, flat window fills, no shadows. Keep it: add structure lines, never shading. |
| **Francis D. K. Ching, *Architectural Graphics*** (via a university drawing standard that cites him) [S32] | The **line-weight hierarchy**. Heavy lines for profiles and *spatial edges*, where a solid meets open air. Medium for edges and intersections of planes. Light for shallow depth changes. Lightest for a change of material when the form stays the same. |
| **Architectural drawing practice** (CAERT technical reference; elevation-depth tutorials) [S33][S34][S35] | Give each depth plane its own weight, heaviest in front. Draw brick joints and shingles in **halftone** (grey), never at full weight. Drop detail as you recede: a background building needs no windows or texture, because absence of detail reads as distance. |
| **Stephen Wiltshire**, city panoramas [S36] | Recognition comes from **counts**: individual windows, the small buildings in the gaps. Count storeys, bays and steps from the reference, store the counts in the spec, then draw. |
| **James Gulliver Hancock**, *All the Buildings in New York* [S37] | Technical-drawing training behind loose-looking line art: reportedly a mechanical pencil switched between 0.25, 0.3 and 0.5 lines, so three weights. Also two or three accent colours per building to pick out its main features. Our equivalent is white line, amber light and sun yellow for the active state, and nothing else. (Reported in coverage of the project; not checked against the book.) |

### 1.2 Rules we can code

**R1. Four stroke tiers** (viewBox units; the panel renders at about 1 u = 1 px on desktop):

| Tier | Width | What | Today |
|---|---|---|---|
| T0 ground | 2.4 | the pavement line `y = GROUND` | 2.0 |
| T1 contour | 2.0 | each building's silhouette (spatial edge against sky or neighbour) and door openings | 2.0, keep |
| T2 planar | 1.25 | cornices and floor bands, pilasters, timber members, gable stage lines, stair cheeks, the Dom's gable rakes and ridge | (none) |
| T3 material | 0.75 at 50% opacity | glazing bars (in `--casa-ink-deep`, drawn over the window fill), stair nosings, beam ends, the few brick-course hints | (none) |
| Far | `1.2` at `k = 5` (mill), `1.0` at `k = 2.5` (Dom), inside the existing `.far` group at opacity 0.32 | landmarks behind the street | 1.6 |

Hover: T1 and T2 of the active house turn `--casa-sun`. T3 stays as it is, so the yellow reads as structure and not as noise.

**R2. Detail budget by distance.**
- Street (`k = 10`): contour, openings, and **one** material or structure cue per building (timber frame, gable
  stages, or the sandstone band at a cornice).
- Wall (mill, `k = 5`): contour plus the members that identify the type: brick/timber division, octagon arrises,
  gallery and railing, cap, stocks, sail frames with 8 shutter bars. No texture.
- City (Dom, `k = 2.5`): contour plus at most three identifiers (Rhenish helm lines, clock, vane). No windows.

**R3. Draw only what is real at the drawing's scale.** At 10 u/m a brick course is under one unit and would turn
to noise. Cornices, floor bands, timber members (0.15–0.25 m), glazing bars (about 0.08 m) and stair nosings are real
at this scale, so they are what carries material. Brick appears as at most 3–5 course lines in one corner, at T3,
fading out ("indicate, don't fill" [S33][S35]).

**R4. Negative space.** The sky band above about y 150 stays free except for the moon, the stars and the
hover captions. Each landmark keeps at least 12 u from every marker label box and from the caption box at its
largest rendered height. Landmarks pass *behind* the street: the ink-panel house fills mask them. A landmark's base
never floats visibly on the street's ground line at a smaller scale, because that reads as a toy on the pavement.
Hide the base behind houses or behind a mound (§3.3).

**R5. One light logic.** Light is *emitted*, never cast: lit windows (amber), the lamp, the moon, the pointer glow
(`useHeroGlow`). No drop shadows, no one-sided rim highlights, no hatching. This is the ligne-claire rule [S31],
and it keeps the night ground clean.

**R6. One uniform scale per object, all values in metres.** `const K_WALL = 0.5 * M; const K_DOM = 0.25 * M;`
Write every number as `metres * k` so a reader can check it against §2.

**R7. Count, then draw.** Storeys, bays, gable stages, steps, risers, sail bars and shutter rows are integers in
the spec object, never the side effect of a width.

**R8. Symmetry is computed.** Generate one half of a gable, helm or mill from the axis and mirror it
(`x' = 2·cx − x`). Never place mirrored points by hand.

**R9. Grid and rounding.** Metres on a 0.1 m grid. Every emitted coordinate goes through `r2()` so server and
browser render the same string (hydration).

**R10. Type.** Playfair Display for display words. Plus Jakarta Sans for labels and for **any string containing the
digit 1** ("A1", "B1", "C1", "B1+"), because Playfair's 1 reads as l.

---

## 2. Bremen references, converted to our scale

### 2.1 St. Petri Dom (Bremer Dom), west front

**Facts**

| Item | Value | Source |
|---|---|---|
| Plan of each west tower | square, **11 m** a side | [S1] |
| Height, south / north tower, with weathervane | **93.27 m / 93.26 m** (GeoInformation Bremen); 92.31 m in another survey | [S1] |
| Weathervane | **2.38 m**; tower without vane **90.89 m** | [S1] |
| Absolute height | 103.79 m above NN with vane (south), so the ground is about 10.5 m NN; a survey gives 98.45 m NN to the underside of the vane's knob | [S5] |
| Viewing platform | south tower, **about 57 m**, directly above the base line of the gable triangles | [S1] |
| Older text of the same article | platform "under the roof start" at about 68 m | [S2] |
| Helm form | "Rhenish helmets" (1890s), copper, now patinated, masonry inside with a spiral stair | [S1][S3] |
| Rhenish helm / Rhombendach geometry | square plan; **one gable triangle on each face**; four **rhombic** roof faces turned 45° to the gables; their top points meet at the apex, their bottom points sit on the wall corners. Roof height to gable height **2 : 1** | [S4] |
| Clock | two dials on the **north** tower, in the **west** and north gable fields | [S1] |
| Rose window | between the towers; outer ring modelled on Notre-Dame de Paris, evangelist symbols around it | [S1] |
| Portals | two, with mosaics in the arches; a stone arcade gallery above them | [S1] |
| Gap between towers | a **15 m** rope bridge was hung between the towers at 65 m in 2009 | [S1] |
| Rebuild | 1888–1901, Max Salzmann then Ernst Ehrhardt, late Romanesque "Rhenish transition" forms | [S1] |

**DERIVED proportions**

- Tower shaft up to the gable foot: 57 m = **5.18** tower widths.
- Gable height: 68 − 57 = **11 m** (DERIVED from [S2]'s 68 m roof start, which is the side gables' apex in
  elevation). Gable pitch = atan(11 / 5.5) = **63.4°**.
- Helm above the gable apex: 90.89 − 68 = **22.89 m**, giving 22.89 : 11 = **2.08 : 1**. This agrees with the
  2 : 1 in the Rhombendach definition [S4], so the two independent sources support each other.
- Clear gap between towers ≈ **15 m** (ASSUMPTION: the bridge length is taken as the clear distance), so the west front is
  11 + 15 + 11 = **37 m** wide.
- Everything between the towers (west gable, nave roof) is **below 65 m**, because the 2009 bridge hung in free air there.

**What a Rhenish helm looks like in a front elevation** (derived from the geometry in [S4]; tower left edge `L`,
width `W`, centre `cx`, gable foot `yG`, gable height `G`, tip `yT`):

- Silhouette: `M L,ground V(yG−G) L cx,yT L L+W,(yG−G) V ground`. The side gables are seen edge-on, so the
  tower edges run straight up to the side gables' apex height, and from there the outer ridges run to the tip.
- Interior lines (T2): the front gable rakes `M L,yG L cx,(yG−G) L L+W,yG`, and the front ridge
  `M cx,(yG−G) V yT`, which shows as a vertical line on the axis.
- Vane: `M cx,yT V(yT − 2.38·k)` plus a short horizontal arrow.

Unknown (do not draw until verified): the height of the central west gable and the nave ridge, the belfry
openings (they would be hidden behind the street anyway, §3.2), and the clock's diameter.

### 2.2 Mühle am Wall (Herdentorswallmühle)

**Facts**

| Item | Value | Source |
|---|---|---|
| Type | **Galerieholländer** (smock mill with a gallery) | [S8][S9][S10] |
| History | built **1833** to plans by mill builder Berend Erling; the wooden upper works burned in **1898** and were rebuilt; damaged again in 1950 and rebuilt; city-owned since 1889 | [S8][S9] |
| Base | **five-storey, octagonal** base of **clinker brick** | [S8] |
| Upper works | **wooden** gallery; roof (cap) | [S9] |
| Sails | **four** shuttered sails (**Jalousieflügel**), **24 m** across, with **brake flaps** | [S8] |
| Sail structure | **steel stocks** (Stahlruten), *Bruststücke* at the hub, shutter flaps (Jalousieklappen) | [S9] |
| Winding | **wind rose** (fantail) turns the cap automatically | [S8][S9] |
| Why a gallery | on a tall mill the sails and tail are out of reach from the ground, so a wooden platform runs round the body to work them | [S11] |
| Comparable large gallery mills | cap height 27.6–30.2 m (Kalkar 27.6, Varel 28.8, Hage 30.2) | [S11] |
| Direction | a right-handed mill turns **anticlockwise** seen from the front; Dutch and Danish designs typically turned opposite to modern turbines, i.e. anticlockwise | [S12][S13] |
| Leading edge | traditional sails carry *leading boards* on the leading side of the stock | [S14] |

**DERIVED and ASSUMPTION dimensions** (no published total height was found; check these on a frontal photo,
using the 24 m rotor as the scale bar):

| Part | Value | Basis |
|---|---|---|
| Sail radius | 12.0 m | 24 m ÷ 2 [S8] |
| Gallery floor | **14.0 m** above the mill's ground | ASSUMPTION: top of five brick storeys of about 2.8 m |
| Sail tip clearance above the gallery | 1.0 m | ASSUMPTION: the gallery exists so the sails can be reached [S11] |
| Hub (windshaft) | 14 + 1 + 12 = **27.0 m** | DERIVED. That is 1.1 rotor diameters, inside the 27.6–30.2 m cap heights of comparable mills [S11] |
| Top of wooden octagon (cap seat) | 26.0 m | ASSUMPTION: the hub is 1 m above the cap seat |
| Cap top | 29.5 m | ASSUMPTION |
| Octagon across flats: base / at gallery / top | 9.0 / 6.6 / 5.0 m | ASSUMPTION |
| Gallery deck | body + 1.8 m each side, railing 1.0 m | ASSUMPTION |
| Sail frame | from 0.2 R to the tip, 2.0 m wide, on the trailing side; leading board 0.6 m on the leading side | ASSUMPTION for the ratios; trailing/leading sides from [S14] |
| Cap shape | hood (half ellipse), 6.0 m wide | ASSUMPTION. The sources name boat-, onion- and cone-shaped caps as types [S11]; check the Mühle am Wall's own cap on a photo |

**An octagon in elevation** (exact geometry, looking square at one face; across flats `F`):
the silhouette is `±F/2`, and the two visible arrises sit at `±F·tan(22.5°)/2 = ±0.2071·F`. Taper `F` linearly with height
and the three lines converge. The visible faces are then the front face (`0.414·F` wide) and two side faces
(`0.293·F` each, foreshortened).

### 2.3 Schnoor houses and Bremen houses

| Item | Value | Source |
|---|---|---|
| Schnoor plot | about **60 m²** per house in the old quarter | [S15] |
| Dates and styles | mostly Classicism (about 1800–1850) and Historicism (about 1850–1890), some Baroque, few Renaissance; oldest dated houses 1401/1402 | [S15] |
| Typical form | **gable houses** (Giebelhäuser) with saddle roofs. Schnoor 15: three storeys, brick painted white. Schnoor 18: two storeys, plastered, 1776. Schnoor 1: two storeys, narrow, long eaves side to one lane and gable to the other. Packhaus Schnoor 2: two storeys, Gothic, 1401 | [S16][S17] |
| Material | half-timbering is characteristic; brick and plaster both common | [S17][S18] |
| Lanes | so narrow in places that you can touch both sides | [S18] |
| **Bremer Haus** | built from the mid-19th century to the 1930s; **eaves-side** (traufständig) to the street, unlike earlier Bremen; **2–3 storeys** over a **Souterrain 1–2 m below street level** reached by an external stair; roof pitch **about 27°**, often invisible from narrow streets; street-side large rooms with **two windows**; staircase at the side of the house; *Erker* common; front gardens almost always; built in groups by one contractor | [S19] |
| Historic window | width **0.9–1.2 m**, height **1.8–2.4 m**, **1 : 2** common; sill **85 cm**; head 40 cm below the ceiling; example storey **3.6 m** gives a 2.05 m clear window | [S20] |
| Ceiling heights 1850–1900 | **3.20–3.80 m** | [S21] |
| Glazing | mostly **four-light** until about 1900, then two-light with a tilting top light; transom ⅓ : ⅔ | [S23][S24] |
| Classicist rhythm | symmetric, central entrance, five or ideally seven axes | [S22] |

DERIVED for our drawing: a 60 m² footprint holds houses 5–8 m wide, so the current widths of 5.6–8.0 m are
plausible. A Bremer Haus with a Souterrain floor at −1.2 m, a 2.6 m Souterrain storey and two 3.6 m storeys
reaches its eaves at 1.4 + 7.2 = 8.6 m. With a 0.6 m cornice that is 9.2 m, **the same eaves line as a
3.2 + 3.0 + 3.0 m gable house**. The street keeps one eaves line (y 300) although the floor lines differ, which is
what a real Bremen street does.

### 2.4 Weser Renaissance, stepped and volute gables

| Item | Value | Source |
|---|---|---|
| Rathaus | over **41 m** long, about 16 m deep; Gothic arcade **3 m** deep with **11 bays**; central projecting bay (1608) with a **four-storey gable**, flanked by **two smaller gables**; copper hip roof | [S25] |
| Stadtwaage | 1586–1588, Lüder von Bentheim; brick with sandstone ornament; **double pilasters on every step of the gable**; shell crowns over the windows; two **round-arched** gates on the ground floor | [S26] |
| Schütting | 1537–38 by an Antwerp architect; east gable 1565 almost unchanged; market front redesigned 1595 towards Weser Renaissance | [S27] |
| Weser Renaissance gables | ornamented gables with semicircular attachments, the *welsche Giebel*; later ones carry rolled strapwork | [S28] |
| Schweifgiebel | a gable with a curved outline, usually rising above the roof as a screen; variants include the **Volutengiebel**; Bremen examples carry **obelisk tops** | [S29] |
| Treppengiebel | the masonry gable rises above the roof covering and **hides it**; Baroque volute gables reduced the steps to a few, sometimes one pair | [S30] |

**Construction rules we draw from these** (DERIVED from the facts above together with the stepped-gable logic):

1. A showpiece gable is a **stack of gable storeys**, each separated by a cornice (four at the Rathaus, one per
   step at the Stadtwaage).
2. Each stage is narrower than the one below. Its top outer corner lies on the roof envelope, so the gable still
   covers the roof [S30].
3. The notch between a cornice end and the stage wall above is filled by a **volute**, a scroll that rises from the
   cornice end and turns in to meet the upper wall.
4. An **obelisk** stands on each cornice end; the top carries a semicircular head [S28] with a finial.
5. **Pilasters**, doubled at the Stadtwaage, frame each stage, on the window axes of the facade below.

---

## 3. Redraw spec for `accommodation-street.tsx`

Street order after the redraw (left to right):

| x (u) | Building | Change |
|---|---|---|
| 24–104 | stepped gable, 8.0 m, 3 storeys | windows; loft floors with a hoist door |
| 104–180 | **Wall gap: the mill on its bastion** | was the 6.4 m pitched house (option B, recommended) |
| 180–330 | CASA flat (modern block) | keep; T2 floor bands optional |
| 336–400 | **Weser Renaissance volute gable**, 6.4 m | was the 5.6 m bell gable |
| tree at 423, crown r 2.0 m | street tree | moved from 419, r 2.2 → 2.0 m |
| 446–566 | **pair of Bremer Häuser**, 2 × 6.0 m; host link on the left one | was the detached family house |
| lamp at 576 | street lamp | keep |
| 584–648 | stepped gable, 6.4 m | windows; loft floors with a hoist door |
| 652–716 | **timber-framed gable house**, 6.4 m | was the plain pitched house |

Shared changes for the historic houses: windows `1.0 × 1.8 m` (`WINDOW_H = 1.8 * M`, width `1.0 * M`), sill
0.9 m. On ground storeys the head is at 2.7 m of 3.2; on upper storeys at 2.7 m of 3.0. Each lit window gets a T3
mullion on its axis and a transom at ⅓ from the top, in `--casa-ink-deep` over the fill. The modern block keeps
`1.6 × 1.6 m` single panes. That contrast between the eras is correct.

### 3.1 Strokes and layers

- Ground line: 2.4. House outline: 2.0 (keep). Add per house a `detail` path (T2, 1.25) and a `texture` path (T3, 0.75,
  opacity 0.5). Both fade in with the windows after the outline has drawn, so the `pathLength = 1` draw-in stays on
  the outline only.
- `.far` group: the mill at stroke 1.2, the Dom at 1.0, opacity 0.32 (keep).

### 3.2 Dom, `k = 2.5` u/m, axis `x = 650`

```
K_DOM = 2.5
W  = 11 * K = 27.5        gap = 15 * K = 37.5         front = 37 * K = 92.5
left  tower  L = 603.75 .. 631.25   cx = 617.5
right tower  L = 668.75 .. 696.25   cx = 682.5
yG  (gable foot, 57 m)     = 392 − 142.5 = 249.5
yGA (gable apex, 68 m)     = 392 − 170   = 222
yT  (helm tip, 90.89 m)    = 392 − 227.23 = 164.78
yV  (vane top, 93.27 m)    = 392 − 233.18 = 158.83
```

Per tower, fill `--casa-ink-deep`:

- contour: `M L 392 V222 L cx 164.78 L L+W 222 V392`
- T2: gable `M L 249.5 L cx 222 L L+W 249.5`, ridge `M cx 222 V164.78`
- vane: `M cx 164.78 V158.83 M cx−2 160.5 h4`
- **left tower only**, the clock (north tower, west gable field [S1]): circle at `(617.5, 240.33)` (the gable
  centroid, `yG − (yGA−yG)/3`), `r = 4.5` (ASSUMPTION 1.8 m). It fits: the gable's half-width at that height is 9.17.

Delete `M642 236 L650 226 L658 236`. At `k = 2.5` it stands at about 66 m, where the real towers have free air
between them [S1]. Draw nothing between the towers: at this scale the west gable, rose and portals are below the
street's roofline (houses 6 and 7 reach y 251–254 there).

Check: the vane tops out at y 158.8, lower than today's tips at y 132, so there is more room for the "flat" caption
(top right). Measure the caption's rendered bottom at `sm` and `lg`. If it is closer than 12 u, use `K_DOM = 2.2`
(tip y 192).

### 3.3 Mühle am Wall, `k = 5` u/m, axis `x = 142` (option B: in the Wall gap)

Why the gap: the gallery is the type-defining part, and it sits at 14 m. At any scale below about `k = 7`, the
3-storey houses (eaves 9.2 m) hide it if they stand in front of the mill. A larger mill would collide with the
host caption. So remove the 6.4 m pitched house at x 110 and let the street open onto the Wall. Hide the
mill's foot behind the **bastion mound** it stands on [S8] (R4).

```
K_WALL = 5
mound: M104 392 Q142 352 180 392 (fill ink-panel, far stroke)   -> mill ground yM = 372
yGal (gallery 14 m)     = 372 − 70    = 302
yC   (cap seat 26 m)    = 372 − 130   = 242
yH   (hub 27 m)         = 372 − 135   = 237
yCap (cap top 29.5 m)   = 372 − 147.5 = 224.5
R    (sail 12 m)        = 60     -> top tip y 177, bottom tip y 297 (1 m above the deck, level with the railing top)
```

- **Brick base** (yM → yGal): across flats 45 → 33 u. Silhouette `±F/2`, arrises at `±0.2071·F` (T2).
  T2 storey lines at 2.8 m intervals are optional (the "five storeys" [S8]).
- **Gallery** at y 302: deck line x 116.5–167.5 (10.2 m), railing line 5 u above (y 297) with 4 posts, and two struts
  from the deck ends down to the body at y 309.5.
- **Wooden octagon** (yGal → yC): across flats 33 → 25 u, with arrises. Its contour starts at the gallery, so the
  change from brick to timber shows as the gallery line itself.
- **Cap**: half ellipse on y 242, `rx 15`, `ry 17.5` (top y 224.5). The wind rose stands behind the cap, its wheel
  edge-on in this view. Optional at this distance (R2); if drawn, a 15 u vertical stroke on the axis that rises
  above the cap.
- **Sails** (inside the rotating `.sails` group, `transformOrigin: 142px 237px`): **two stocks**, each a full
  diameter line through the hub: `M142 177 V297` and `M82 237 H202`. For each of the four arms, the frame on the
  **trailing** side: for the upward arm, `rect x 142..152, y 177..225` (0.2 R to R, 2.0 m wide), 8 shutter
  bars across it at 6 u spacing, and a 3 u leading-board line on the other side of the stock from y 177 to 225.
  Rotate the arm group by 90° steps as today.
- **Direction**: `@keyframes casa-street-turn { to { transform: rotate(-360deg) } }`. Anticlockwise, so the
  frames trail [S12][S13][S14].
- Clearances: the top tip (y 177) sits under the host caption. The tip at 45° up-right `(184.4, 194.6)`
  is about 25 u from the left end of the WG marker label. Measure both at `sm`.

*Option A (fallback, keeps the pitched house):* same mill, mound omitted, base at y 392. Draw only what shows above
the house (cap, sails, top of the timber octagon) and leave out the gallery, which is hidden. Never draw a gallery
that the house in front would cover.

### 3.4 Stepped gables (houses 1 and 6)

Keep the construction (3 steps, cap = 0.2 w, inner corners on the 55° line). It matches the rule that the gable
hides the roof [S30]. Add the loft floors, as in a Bremen gable house (and a Packhaus [S17]):

House 1 (x 24, w 80, eave y 300, tread 10.67, riser 15.23, top 239.07):
- loft row 1: two windows `1.0 × 1.4 m` on the bay axes x 44 and 84, y 280–294. They clear the step-1 edge
  (x 34.67 / 93.33).
- loft row 2: hoist door `1.0 × 1.4 m` on the axis, x 59–69, y 256–270.
- hoist beam end, seen end-on: a 3 × 3 square centred `(64, 248)` with a 4 u hook line below it (T2).
  (Hoist beams are general knowledge for Hanseatic merchant houses; not sourced here.)

House 6 (x 584, w 64, tread 8.53, riser 12.19, top 251.2):
- loft row 1: windows `0.9 × 1.3 m` on x 600 and 632, y 281–294.
- hoist door `0.9 × 1.2 m`, x 611.5–620.5, y 262–274 (inside the step-3 half-width of 6.4 u).

### 3.5 Weser Renaissance volute gable (house 4, replaces `bell`)

`x = 336, w = 64 (6.4 m), cx = 368`, 3 storeys, eave y 300, built inside the same 55° envelope (apex y 254.3).
Envelope half-width at height `h` above the eave: `32 − h / PITCH`.

| Element | Geometry |
|---|---|
| Cornice 1 | T2 line at y 300 from x 334 to 402 (0.2 m proud) |
| Stage 1 | 2.2 m: wall half-width `32 − 22/1.4281 = 16.6` → wall x 351.4–384.6, y 300→278 |
| Cornice 2 | y 278, x 349.4–386.6 |
| Stage 2 | 1.6 m: half-width `32 − 38/1.4281 = 5.39` → wall x 362.61–373.39, y 278→262 |
| Crown | half circle on y 262, `r 5.39` (top 256.61, inside the envelope), finial 1.0 m (to y 246.6) |
| Volute, stage 1, left | foot `F(336, 300)`, head `H(351.4, 278)`, `t = 15.4`, `h = 22`: `M336 300 C336 287.9 344.47 278 351.4 278`, plus a curl, a circle `r = 1.85` at `(337.85, 298.15)` |
| Volute, stage 2, left | `F(351.4, 278)`, `H(362.61, 262)`: `C351.4 269.2 357.57 262 362.61 262`, curl `r = 1.35` |
| Rule for any volute | `C (F.x, F.y − 0.55h) (H.x − 0.45t, H.y) H`; curl `r = 0.12·min(t, h)` tangent inside the foot; mirror for the right side |
| Obelisks | on the four cornice ends (336, 300), (400, 300), (351.4, 278), (384.6, 278): plinth `4 × 3`, then shaft `M x−1.5 y−3 L x y−14 L x+1.5 y−3` (ASSUMPTION 0.4 × 1.4 m) |
| Double pilasters | T2 verticals 3 u apart just inside each stage wall edge (Stadtwaage [S26]) |
| Gable openings | stage 1: one window `0.9 × 1.4 m`, x 363.5–372.5, y 281–295; stage 2: oculus `r 4` at (368, 270) |
| Ground floor | door bay as a **round-arched** opening `1.2 × 2.6 m` (the Stadtwaage's gates [S26]) |

The current `bell` code and its `round` disc go. S-curves into a neck read as Amsterdam, not Bremen (§0 row 4).

### 3.6 Pair of Bremer Häuser (house 5, replaces `family`)

`x = 446`, two houses of 6.0 m (x 446–506 and 506–566), mirrored about x 506. Each has **3 axes of 2.0 m**
(ASSUMPTION width), the entrance axis beside the shared party wall and two windows of the large room on the other
axes [S19].

```
street            y 392
Souterrain floor  −1.2 m (hidden)                [S19: 1–2 m below street]
Hochparterre  HP  +1.4 m  -> y 378               (ASSUMPTION: 2.6 m Souterrain storey)
first floor   F1  HP + 3.6 m -> y 342            [S20][S21]
eaves             F1 + 3.6 m -> y 306
cornice top       +0.6 m -> y 300                (= the gable houses' eaves line)
ridge (27°, depth 10 m ASSUMPTION): rise 5 · tan 27° = 2.55 m -> y 274.5   [S19]
```

- Contour: `M446 392 V300 H566 V392` with the cornice overhanging 3 u each side (x 443–569). The roof is a band:
  `M446 300 V274.5 H566 V300`, with vertical ends because the gable ends are seen edge-on. T3: 2–3 short
  slate-course lines under the ridge, in one corner only.
- Chimney on the party wall: x 501.5–510.5, from the ridge to y 262.5.
- Window axes x 456, 476 (left house) and 536, 556 (right house). Door axes x 496 and 516.
  - Souterrain windows `1.0 × 0.8 m`, y 382–390.
  - Hochparterre windows `1.0 × 2.0 m` (1 : 2 [S20]), sill 0.85 m → y 349.5–369.5.
  - First-floor windows, the same → y 313.5–333.5.
  - Doors `1.1 × 2.9 m` including a 0.5 m fanlight, y 349–378, x 490.5–501.5 and 510.5–521.5. Their heads line up
    with the window heads.
- **External stair** to each door: **8 risers of 17.5 cm** = 1.4 m. The tread is 28 cm, because
  2 × 17.5 + 28 = 63 cm satisfies the step rule in DIN 18065 [S38]. In front elevation the stair shows as 8
  T3 nosing lines at 1.75 u spacing (y 390.25 … 378), 13 u wide on the door axis, between two T2 cheek lines.
- T2 bands at HP (y 378) and F1 (y 342).
- Optional, after the basic version: an *Erker* over the two window axes [S19]; a front-garden railing.
- **Hotspot**: `kind: 'host'` on the left house only. Its box is x 443–506, y 274.5–392, which is about 30 × 56 px at a
  375 px viewport, above the 24 × 24 px minimum target size. The marker sits on its ridge, and the label goes in
  the free sky above it.

### 3.7 Timber-framed gable house (house 7, replaces the last `pitched`)

`x = 652, w = 64`, 55° gable (keep), eave y 300.
- Ground storey (3.2 m): masonry, no framing. Two or three T3 course hints at the lower left corner.
- Upper storeys: the front jetties show in elevation as **double floor lines** (sill and plate, 4 u apart) at
  y 360 and 330, with T3 beam-end ticks every 8 u along the lower line. The width does not change: the jetty
  projects towards the viewer, and the house already ends 4 u from the viewBox edge.
- Posts (T2) at x 652, 662, 674, 684, 694, 706, 716: the outer edges, the window jambs and the bay line. Rails (T2) at
  each storey's sill and head heights.
- One brace per outer panel (x 652–662 and 706–716): from the foot of the outer post to the inner post at ⅔ of
  the storey height.
- Gable: the posts continue up to the roof line; T2 collar lines at the loft floors. The existing gable window stays
  on the axis.

Half-timbering is characteristic of the Schnoor [S18]. The bracing pattern is an ASSUMPTION; check it against a
Schnoor timber-framed facade before adding more members.

### 3.8 Unchanged, and checks before merging

- The CASA flat (15 m, 5 storeys, parapet, canopy), tram, lamp and the rails stay. The kerb and rail lines below
  `GROUND` are a pictorial foreground strip, not elevation, and that convention is fine.
- Move the star `[690, 150]` → `[706, 118]` (§0 row 8).
- At 375, 768 and 1280 px, in DE and EN: no label or caption within 12 u of a landmark; no horizontal scroll.
- `prefers-reduced-motion`: the sails stand still at a 45° rest position (a "rest" X), and the finished picture
  shows all details.
- Keyboard and touch: hotspots unchanged, apart from the smaller host box (§3.6).
- Hydration: every new coordinate goes through `r2()`.
- Photo checks before calling the drawing exact: the Mühle am Wall's cap shape, gallery height and body taper
  (use the 24 m rotor as the ruler); the Dom's gable height (68 m roof start) and clock size.

---

## 4. Note for the courses hero: the staircase

The owner suggested "the staircase one" for courses. The film has it: `CASA-film/video/src/scenes/Journey.tsx`,
six steps **A1, A2, B1, B1+, B2, C1**. *telc B2* lights on B2 and *telc C1 Hochschule* on C1, so no level claims
another level's exam. Before shipping, check the levels and exams against `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md`.

If it is ported as a coded hero, the same rules apply:
- **It is a diagram, not true scale.** A real riser at 10 u/m would be under 2 u. If the drawing borrows stair
  geometry, keep the real *proportion*: tread : riser = 28 : 17.5 = **1.6**, from the step rule
  2s + a = 63 cm [S38]. The film's steps are 224 : 78 (2.9 : 1), which reads as **landings**. Either draw each
  level as a landing with a short real flight (for example 3 risers) up to it, or call the steps landings and keep
  the film's ratio. Do not mix the two.
- T1 contour for the steps; the active level lit in `--casa-sun` with the warm glow; ligne claire (R5).
- Level codes contain the digit 1, so set them in **Plus Jakarta Sans** (R10); Playfair only for display words.
- Each level is a button or a link that works by mouse, touch and keyboard. Under `prefers-reduced-motion`, show
  the finished staircase with nothing moving. The section after the night hero must be light.

---

## Sources

- [S1] Bremer Dom, German Wikipedia — tower plan, heights, vane, platform at the gable base line, clock, rose, portals, 2009 bridge, rebuild. https://de.wikipedia.org/wiki/Bremer_Dom
- [S2] Older copy of the same article, platform "under the roof start" at about 68 m. https://de-academic.com/dic.nsf/dewiki/197506
- [S3] Bremen Cathedral, English Wikipedia — "Rhenish helmets" of the 1890s. https://en.wikipedia.org/wiki/Bremen_Cathedral
- [S4] Rhombendach, German Wikipedia — geometry of the Rhenish helm, roof : gable height 2 : 1. https://de.wikipedia.org/wiki/Rhombendach
- [S5] Weser-Kurier, "Rätselraten über die Höhe der Domtürme" — NN survey values. https://www.weser-kurier.de/bremen/stadtteil-mitte/raetselraten-ueber-die-hoehe-der-domtuerme-doc7e4dgh2l7ck1k2ckx5bq ; tower climb page: https://stpetridom.de/der-dom/besucher-info/turm/
- [S8] Mühle am Wall, German Wikipedia — Galerieholländer, five-storey clinker octagon, 24 m Jalousieflügel with brake flaps, wind rose, 1833. https://de.wikipedia.org/wiki/Mühle_am_Wall
- [S9] Immobilien Bremen press release, 6 Nov 2012, "Wallmühle kurzzeitig ohne Flügel" — wooden gallery, roof, steel stocks, Bruststücke, wind rose, shutter flaps, history. https://www.immobilien.bremen.de/sixcms/media.php/13/Presse%2B-%2B121106%2BWallm%25C3%25BChle%2Bkurzzeitig%2Bohne%2BFl%25C3%25BCgel%2B%25282%2529.pdf
- [S10] Am Wall Windmill, English Wikipedia — smock mill, 8 sides, shuttered sails. https://en.wikipedia.org/wiki/Am_Wall_Windmill
- [S11] Holländerwindmühle, German Wikipedia — gallery purpose, cap forms, cap heights of comparable mills. https://de.wikipedia.org/wiki/Holländerwindmühle
- [S12] Mills Archive glossary — right-handed (anticlockwise from the front) and left-handed mills. https://millsarchive.org/glossary/a-z-glossary/3422 (the glossary's own entries disagree on the Dutch term; the direction is consistent)
- [S13] SlashGear, why traditional Dutch windmills did not turn clockwise. https://www.slashgear.com/2237003/why-modern-wind-turbines-turn-clockwise-dutch-windmills-dont/
- [S14] Windmill sail, English Wikipedia — leading boards. https://en.wikipedia.org/wiki/Windmill_sail
- [S15] Schnoor, German Wikipedia — plot size, dates, styles. https://de.wikipedia.org/wiki/Schnoor
- [S16] Haus Schnoor 15, German Wikipedia. https://de.wikipedia.org/wiki/Haus_Schnoor_15
- [S17] Wohnhaus Schnoor 1, Wohnhaus Schnoor 18, Packhaus Schnoor 2, German Wikipedia. https://de.wikipedia.org/wiki/Wohnhaus_Schnoor_1 · https://de.wikipedia.org/wiki/Wohnhaus_Schnoor_18 · https://de.wikipedia.org/wiki/Packhaus_Schnoor_2
- [S18] bremen.de, Schnoor. https://www.bremen.de/tourismus/sehenswuerdigkeiten/schnoor
- [S19] Bremer Haus, German Wikipedia — typology, Souterrain, 27° roof, eaves-side. https://de.wikipedia.org/wiki/Bremer_Haus
- [S20] Digitised historical building handbook, UB Paderborn — window widths and heights, 1 : 2, sill 85 cm, 3.6 m storey. https://digital.ub.uni-paderborn.de/download/pdf/8038440.pdf (and …/8038441.pdf)
- [S21] jacasa.de lexicon, Deckenhöhe — 3.20–3.80 m for 1850–1900. https://www.jacasa.de/ratgeber/lexikon/deckenhoehe
- [S22] Wiesbaden Stadtlexikon, Klassizismus — five to seven axes. https://www.wiesbaden.de/stadtlexikon/stadtlexikon-a-z/klassizismus
- [S23] Berlin Treptow-Köpenick, design recommendations for Friedrichshagen — standing formats, transom ⅓ : ⅔. https://www.berlin.de/ba-treptow-koepenick/politik-und-verwaltung/aemter/stadtentwicklungsamt/stadtplanung/erhaltungs-verordnungen/artikel.94620.php
- [S24] Röttenbach, Fenster-Infoblatt — four-light until 1900. https://www.roettenbach.de/fileadmin/user_upload/PDF/Fenster_Infoblatt.pdf
- [S25] Bremer Rathaus, German Wikipedia — length, arcade, four-storey gable. https://de.wikipedia.org/wiki/Bremer_Rathaus
- [S26] Stadtwaage (Bremen), German Wikipedia — double pilasters per gable step, round-arched gates. https://de.wikipedia.org/wiki/Stadtwaage_(Bremen)
- [S27] Schütting (Bremen), English Wikipedia; Bremen sehenswert. https://en.wikipedia.org/wiki/Sch%C3%BCtting_(Bremen) · https://bremen-sehenswert.de/english/schuetting.htm
- [S28] Weser Renaissance, English Wikipedia — welsche Giebel. https://en.wikipedia.org/wiki/Weser_Renaissance
- [S29] Schweifgiebel, German Wikipedia — curved gable, Volutengiebel, Bremen obelisk tops. https://de.wikipedia.org/wiki/Schweifgiebel
- [S30] Treppengiebel, German Wikipedia — gable hides the roof; Baroque reduction of steps. https://de.wikipedia.org/wiki/Treppengiebel
- [S31] Ligne claire, English Wikipedia. https://en.wikipedia.org/wiki/Ligne_claire
- [S32] University of Memphis architecture drawing standards (line weights after Ching, *Architectural Graphics*). https://memphis.edu/architecture/docs/drawing.standards.pdf
- [S33] CAERT technical drawing reference (ISBE) — halftone weight for brick joints and shingles. https://www.isbe.net/CTEDocuments/TEE-600077.pdf
- [S34] Pluralsight, five tips for depth in elevation drawings. https://www.pluralsight.com/blog/architecture/five-tips-creating-depth-elevation-drawings-autocad
- [S35] Architecture Courses, lines in architectural sketches. https://www.architecturecourses.org/learn/lines-in-architectural-sketches
- [S36] Untapped Cities on Stephen Wiltshire's New York panorama. https://untappedcities.com/2017/11/17/british-artist-draws-nyc-skyline-from-memory/
- [S37] James Gulliver Hancock coverage. https://www.untappedcities.com/artist-spotlight-james-gulliver-hancock/ · https://www.themarginalian.org/2013/04/10/all-the-buildings-in-new-york/
- [S38] Baunetz Wissen, Stufen: Definition, Begriffe und Regeln (step rule per DIN 18065 §6.1.2; residential riser 14–20 cm, going 23–37 cm). https://www.baunetzwissen.de/treppen/fachwissen/treppenelemente/stufen-definition-begriffe-und-regeln-3352555
