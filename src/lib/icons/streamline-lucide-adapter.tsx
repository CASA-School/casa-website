import * as React from 'react';

export interface LucideProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
}

export type LucideIcon = React.ForwardRefExoticComponent<
  LucideProps & React.RefAttributes<SVGSVGElement>
>;

type StreamlineIconData = {
  body: string;
  width?: number;
  height?: number;
  hidden?: boolean;
};

const DEFAULT_ICON_WIDTH = 14;
const DEFAULT_ICON_HEIGHT = 14;

const ICON_DATA: Record<string, StreamlineIconData> = {
  "ai-chip-spark": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.5 8.833H.679m12.642 0H11.5m-9-3.666H.679m12.642 0H11.5M5.167 2.5V.679m0 12.642V11.5m3.666-9V.679m0 12.642V11.5m1.667-9h-7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1\"/><path d=\"M4.667 7.25c-.281-.048-.281-.452 0-.501a2.55 2.55 0 0 0 2.05-1.964l.018-.078c.06-.278.457-.28.52-.002l.02.09a2.56 2.56 0 0 0 2.057 1.953c.283.049.283.455 0 .504a2.56 2.56 0 0 0-2.057 1.952l-.02.09c-.063.278-.46.276-.52-.002l-.017-.077A2.55 2.55 0 0 0 4.667 7.25\"/></g>"
  },
  "alarm-clock": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 13.5a5.5 5.5 0 1 0 0-11a5.5 5.5 0 0 0 0 11M.5 2.5A8.7 8.7 0 0 1 3 .5m10.5 2a8.7 8.7 0 0 0-2.5-2\"/><path d=\"M7 5v3h2.5\"/></g>"
  },
  "arrow-curvy-up-down-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M.5 11L3 13.5v-11a2 2 0 1 1 4 0v9a2 2 0 0 0 4 0V.5L13.5 3\"/>"
  },
  "arrow-down-2": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m4 6.5l3 3l3-3m-3-6v9m-3.5 4h7\"/>"
  },
  "arrow-round-left": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.75.5L2.25 3l2.5 2.5\"/><path d=\"M1.75 8.25A5.25 5.25 0 1 0 7 3H2.25\"/></g>"
  },
  "arrow-round-right": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9.25.5l2.5 2.5l-2.5 2.5\"/><path d=\"M12.25 8.25A5.25 5.25 0 1 1 7 3h4.75\"/></g>"
  },
  /*
   * A straight right arrow, added because there was not one.
   *
   * `ArrowRight` used to map to "arrow-round-right" above, which is a 5.25r arc
   * with a head on it — a return/loop mark, not a direction. Rendered at 14-16px
   * it reads as a refresh icon, and it is on 50 call sites. That went unnoticed
   * while every one of them sat inside a filled button as a white glyph on dark;
   * demoting those CTAs to text links put the same mark next to body-coloured
   * text where it is unmistakable.
   *
   * Geometry matches "arrow-up-1" (the one straight arrow the set already had),
   * rotated: same 14x14 box, same stroke treatment, same 3.5px head.
   */
  "arrow-right-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M.5 7h13M10 3.5L13.5 7L10 10.5\"/>"
  },
  "arrow-up-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M7 13.5V.5M10.5 4L7 .5L3.5 4\"/>"
  },
  "blank-calendar": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M1.5 2a1 1 0 0 0-1 1v9.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-2M.5 5.5h13m-10-5v3m7-3v3M3.5 2h5\"/>"
  },
  "bookmark": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m11 13.5l-4-4l-4 4v-12a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z\"/>"
  },
  "building-2": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M8.5 13.5h-8V4l4-3.5l4 3.5zm0 0h5v-7h-5m-4 7v-2M3 8.5h3m-3-3h3\"/>"
  },
  "bullet-list": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M1 3a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1m3.5-.5h9M1 7.5a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1M4.5 7h9M1 12a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1m3.5-.5h9\"/>"
  },
  "business-handshake": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m.548 3.085l2.194 1.18l1.96-.338a2.23 2.23 0 0 1 1.844.515v0m4.736 4.84L8.18 11.486a2 2 0 0 1-2.285.022L.548 7.863\"/><path d=\"m13.402 7.84l-2.195 1.5l-3.406-2.75l-1.253.911a1.17 1.17 0 0 1-1.609-.226v0a1.17 1.17 0 0 1 .169-1.613l1.305-1.097a3 3 0 0 1 2.25-.688l2.033.218l2.706-1.463\"/><path d=\"M7.801 6.597c.82.73 1.982.357 2.414-.239\"/></g>"
  },
  "business-profession-home-office": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5.272 6.346h3.455s1 0 1 1v2.456s0 1-1 1H5.272s-1 0-1-1V7.346s0-1 1-1m.474 0v-.572a1 1 0 0 1 1-1h.51a1 1 0 0 1 1 1v.572\"/><path d=\"M13.5 6.94a1 1 0 0 0-.32-.74L7 .5L.82 6.2a1 1 0 0 0-.32.74v5.56a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1z\"/></g>"
  },
  "calculator-1": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11.5.5h-9a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1m-10 5h11\"/><path d=\"M4.25 8.5a.25.25 0 0 1 0-.5m0 .5a.25.25 0 0 0 0-.5M7 8.5A.25.25 0 0 1 7 8m0 .5A.25.25 0 0 0 7 8m2.75.5a.25.25 0 0 1 0-.5m0 .5a.25.25 0 0 0 0-.5m-5.5 3a.25.25 0 1 1 0-.5m0 .5a.25.25 0 1 0 0-.5M7 11a.25.25 0 1 1 0-.5m0 .5a.25.25 0 1 0 0-.5m2.75.5a.25.25 0 1 1 0-.5m0 .5a.25.25 0 1 0 0-.5M10 3H9\"/></g>"
  },
  "check": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m.5 8.55l2.73 3.51a1 1 0 0 0 1.56.03L13.5 1.55\"/>"
  },
  "circle": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M7 13.5a6.5 6.5 0 1 0 0-13a6.5 6.5 0 0 0 0 13\"/>"
  },
  "circle-clock": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 13.5a6.5 6.5 0 1 0 0-13a6.5 6.5 0 0 0 0 13\"/><path d=\"M7 4.5V7l2.54 2.96\"/></g>"
  },
  "clipboard-check": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8.5.5h-3a1 1 0 0 0-1 1V2a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-.5a1 1 0 0 0-1-1\"/><path d=\"M9.75 1.5h1.5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h1.5\"/><path d=\"m5 9l1.5 1l3-4\"/></g>"
  },
  "cog": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m5.23 2.25l.43-1.11A1 1 0 0 1 6.59.5h.82a1 1 0 0 1 .93.64l.43 1.11l1.46.84l1.18-.18a1 1 0 0 1 1 .49l.4.7a1 1 0 0 1-.08 1.13l-.73.93v1.68l.75.93a1 1 0 0 1 .08 1.13l-.4.7a1 1 0 0 1-1 .49l-1.18-.18l-1.46.84l-.43 1.11a1 1 0 0 1-.93.64h-.84a1 1 0 0 1-.93-.64l-.43-1.11l-1.46-.84l-1.18.18a1 1 0 0 1-1-.49l-.4-.7a1 1 0 0 1 .08-1.13L2 7.84V6.16l-.75-.93a1 1 0 0 1-.08-1.13l.4-.7a1 1 0 0 1 1-.49l1.18.18zM5 7a2 2 0 1 0 4 0a2 2 0 0 0-4 0\"/>"
  },
  "compass-navigator": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11.04 1.605a1.099 1.099 0 0 1 1.355 1.355l-1.902 6.772a1.1 1.1 0 0 1-.76.761L2.96 12.395a1.099 1.099 0 0 1-1.355-1.355l1.902-6.772c.103-.37.392-.658.76-.761z\"/><path d=\"M5.689 5.689a1.854 1.854 0 1 0 2.622 2.622a1.854 1.854 0 1 0-2.622-2.622\"/></g>"
  },
  "computer-robot-cyborg-artificial-robotics-robot-intelligence-machine-technology-android": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12.5 9.5c0-3-2.46-5-5.5-5s-5.5 2-5.5 5v4h11ZM7 4.5v-4m-5.5 10h11m-7.5 0v3m4-3v3\"/><circle cx=\"5\" cy=\"8\" r=\".5\"/><circle cx=\"9\" cy=\"8\" r=\".5\"/></g>",
    "hidden": true
  },
  "credit-card-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M12.5 2.25h-11a1 1 0 0 0-1 1v7.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7.5a1 1 0 0 0-1-1m-12 3.5h13m-4 3.5H11\"/>"
  },
  "dashboard-circle": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M3.25 6a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 0 0 0 5.5m7.5 0a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 0 0 0 5.5m-7.5 7.5a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 0 0 0 5.5m7.5 0a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 0 0 0 5.5\"/>"
  },
  "delete-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m13.5.5l-13 13m0-13l13 13\"/>"
  },
  "desktop-check": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5.82 2H1a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V5.587M6 11l-1 2.5M8 11l1 2.5m-5 0h6\"/><path d=\"m8 3.15l2 1.5l3.5-4\"/></g>"
  },
  "edit-image-photo": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m13.5 8.5l-4.71 4.71l-2.13.29l.3-2.13l4.7-4.71zm-9.219 5H1.8a1.3 1.3 0 0 1-1.3-1.3V1.8A1.3 1.3 0 0 1 1.8.5h10.4a1.3 1.3 0 0 1 1.3 1.3v2.95\"/><path d=\"M9.014 4.795a1.25 1.25 0 1 0 0-2.5a1.25 1.25 0 0 0 0 2.5M.5 7.164a10.3 10.3 0 0 1 6.5.961\"/></g>"
  },
  "entertainment-control-button-play-circle-controls-media-multi-play-multimedia-button-circle": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"7\" cy=\"7\" r=\"6.5\"/><path d=\"m5.5 4.5l4 2.5l-4 2.5v-5z\"/></g>",
    "hidden": true
  },
  "entertainment-news-paper-newspaper-periodical-fold-content": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13.5 4.5V11a1.25 1.25 0 0 1-1.25 1.25h0A1.25 1.25 0 0 1 11 11h0V2.25a.5.5 0 0 0-.5-.5H1a.5.5 0 0 0-.5.5v9a1 1 0 0 0 1 1h10.75\"/><path d=\"M3.5 4.25H8v2.5H3.5zm0 5.5H8\"/></g>",
    "hidden": true
  },
  "eye-optic": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 3.625c-4.187 0-5.945 3.766-5.945 3.844S2.813 11.312 7 11.312s5.945-3.765 5.945-3.843S11.187 3.625 7 3.625M2.169 5.813L.61 4.252m4.525-.354L4.5 1.843m7.331 3.97l1.559-1.56m-4.525-.355L9.5 1.843\"/><path d=\"M5.306 7.081a1.738 1.738 0 1 0 3.388.776a1.738 1.738 0 1 0-3.388-.776\"/></g>"
  },
  "facebook-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M.5 12.5v-11a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-3V8.76h.71a.61.61 0 0 0 .61-.61v-.77a.61.61 0 0 0-.61-.61h-.67v-.94c0-.84.38-.84.76-.84h.49a.55.55 0 0 0 .43-.18a.58.58 0 0 0 .18-.43v-.74a.62.62 0 0 0-.6-.64H9.65a2.32 2.32 0 0 0-2.39 2.6v1.17h-.64a.61.61 0 0 0-.62.61v.77a.61.61 0 0 0 .62.61h.64v4.74H1.5a1 1 0 0 1-1-1\"/>"
  },
  "filter-2": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M13.5.5H.5l5 7v6l3-2v-4z\"/>"
  },
  "graduation-cap": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m7 1.367l6.5 2.817L7 7L.5 4.184z\"/><path d=\"m3.45 5.469l.006 3.064S4.529 9.953 7 9.953s3.55-1.42 3.55-1.42l-.001-3.064m-8.854 5.132v-5.89m.001 8.282a1.196 1.196 0 1 0 0-2.392a1.196 1.196 0 0 0 0 2.392\"/></g>"
  },
  "heading-2-paragraph-styles-heading": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M12.926 12.75H9.61v-.753c0-.528.293-1.004.745-1.216l1.845-.86c.441-.206.726-.67.726-1.184c0-.714-.542-1.292-1.211-1.292h-.861c-.542 0-1.002.37-1.173.884M1 12.75V1.25m5.75 0v11.5M1 6.52h5.75\"/>"
  },
  "heading-3-paragraph-styles-heading": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M9.538 11.866c.182.515.673.884 1.25.884h.884c.733 0 1.327-.594 1.327-1.326v-.221c0-.733-.594-1.326-1.327-1.326h-.442h.332a1.216 1.216 0 0 0 0-2.432h-.663c-.557 0-1.026.374-1.17.884M1 12.75V1.25m5.75 0v11.5M1 6.52h5.75\"/>"
  },
  "heart-rate-pulse-graph": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.992 12.413L1.573 7.401c-2.953-2.966 1.355-8.71 5.419-4.064c4.064-4.632 8.412 1.111 5.418 4.064z\"/><path d=\"M3.515 6.753h1.53l1.032-1.968L7.64 8.41l1.343-1.657h1.5\"/></g>"
  },
  "home-3": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M13.5 6.94a1 1 0 0 0-.32-.74L7 .5L.82 6.2a1 1 0 0 0-.32.74v5.56a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1zM7 13.5v-4\"/>"
  },
  "image-picture-gallery-pages-filter-picture-pagination-image": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"10.5\" height=\"8.5\" x=\"3\" y=\"4\" rx=\"1\" transform=\"rotate(180 8.25 8.25)\"/><path d=\"M.5 10V2.5a1 1 0 0 1 1-1h9M3.6 12.42l3.93-4.15A1 1 0 0 1 9 8.26l3.95 4.14\"/></g>",
    "hidden": true
  },
  "incoming-call": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M6.53 12.823a2.7 2.7 0 0 1-3.37-.36l-.38-.38a.91.91 0 0 1 0-1.28l1.6-1.59a.9.9 0 0 1 1.27 0v0a.91.91 0 0 0 1.28 0l2.55-2.55a.91.91 0 0 0 0-1.28v0a.9.9 0 0 1 0-1.27l1.54-1.6a.91.91 0 0 1 1.28 0l.38.38a2.7 2.7 0 0 1 .41 3.37a24.2 24.2 0 0 1-6.56 6.56M2 5.5h3.5V2m0 3.5l-5-5\"/>"
  },
  "instagram": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10.333 3.644a.25.25 0 1 1 0-.5m0 .5a.25.25 0 1 0 0-.5\"/><path d=\"M.858 3.431A2.573 2.573 0 0 1 3.431.858h6.862a2.573 2.573 0 0 1 2.573 2.573v6.862a2.573 2.573 0 0 1-2.573 2.573H3.43a2.573 2.573 0 0 1-2.573-2.573z\"/><path d=\"M4.312 6.862a2.55 2.55 0 1 0 5.1 0a2.55 2.55 0 1 0-5.1 0\"/></g>"
  },
  "interface-alert-warning-circle-warning-alert-frame-exclamation-caution-circle": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"7\" cy=\"7\" r=\"6.5\"/><path d=\"M7 3.5v3\"/><circle cx=\"7\" cy=\"9.5\" r=\".5\"/></g>",
    "hidden": true
  },
  "interface-arrows-button-right-arrow-right-keyboard": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M3.85.5L10 6.65a.48.48 0 0 1 0 .7L3.85 13.5\"/>",
    "hidden": true
  },
  "interface-arrows-button-up-arrow-up-keyboard": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M.5 10.15L6.65 4a.48.48 0 0 1 .7 0l6.15 6.15\"/>",
    "hidden": true
  },
  "interface-arrows-down-arrow-down-keyboard": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M7 .5v13m3.5-3.5L7 13.5L3.5 10\"/>",
    "hidden": true
  },
  "interface-arrows-left-arrow-keyboard-left": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M13.5 7H.5M4 3.5L.5 7L4 10.5\"/>",
    "hidden": true
  },
  "interface-arrows-right-arrow-right-keyboard": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M.5 7h13M10 10.5L13.5 7L10 3.5\"/>",
    "hidden": true
  },
  "interface-arrows-synchronize-arrows-loading-load-sync-synchronize-arrow-reload": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m11 9l2-.5l.5 2\"/><path d=\"M13 8.5A6.76 6.76 0 0 1 7 13h0a6 6 0 0 1-5.64-3.95M3 5l-2 .5l-.5-2\"/><path d=\"M1 5.5C1.84 3.2 4.42 1 7 1h0a6 6 0 0 1 5.64 4\"/></g>",
    "hidden": true
  },
  "interface-calendar-blank-calendar-date-day-month": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M1.5 2.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2m-10 4h13m-10-6v4m7-4v4m-7-2h5\"/>",
    "hidden": true
  },
  "interface-calendar-check-approve-calendar-check-date-day-month-success": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1.5 2.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2m-7-2v4m7-4v4m-7-2h5\"/><path d=\"m4 9l2 1.5l3.5-4\"/></g>",
    "hidden": true
  },
  "interface-content-book-edit-pencil-content-write-notebook-book-edit-composition-creation": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M8 13.5H1.5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1H9m1.5 3l1.5-3l1.5 3V12a1.5 1.5 0 0 1-3 0Zm0 6h3m-10-9v13M6 4h2\"/>",
    "hidden": true
  },
  "interface-dashboard-layout-3-app-application-dashboard-home-layout": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"5\" height=\"7\" x=\"8.5\" y=\"6.5\" rx=\".5\"/><rect width=\"5\" height=\"3.01\" x=\"8.5\" y=\".5\" rx=\".5\"/><rect width=\"5\" height=\"7\" x=\".5\" y=\".5\" rx=\".5\"/><rect width=\"5\" height=\"3.01\" x=\".5\" y=\"10.49\" rx=\".5\"/></g>",
    "hidden": true
  },
  "interface-delete-bin-1-remove-delete-empty-bin-trash-garbage": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m11.5 5.5l-1 8h-7l-1-8M1 3.5h12m-8.54-.29V1.48a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2\"/>",
    "hidden": true
  },
  "interface-edit-view-off-disable-eye-eyeball-hide-off-view": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12.29 5.4c.38.34.7.67.94.93a1 1 0 0 1 0 1.34C12.18 8.8 9.79 11 7 11h-.4m-2.73-.87a12.4 12.4 0 0 1-3.1-2.46a1 1 0 0 1 0-1.34C1.82 5.2 4.21 3 7 3a6.56 6.56 0 0 1 3.13.87M12.5 1.5l-11 11\"/><path d=\"M5.59 8.41A2 2 0 0 1 5 7a2 2 0 0 1 2-2a2 2 0 0 1 1.41.59M8.74 8a2 2 0 0 1-.74.73\"/></g>",
    "hidden": true
  },
  "interface-favorite-give-heart-reward-social-rating-media-heart-hand": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M.5 8.5h2A2.5 2.5 0 0 1 5 11h0m-3 0h5a2 2 0 0 1 2 2h0a.5.5 0 0 1-.5.5h-8m8.25-5l-4-3.7c-2.18-2.19 1-6.43 4-3c3-3.42 6.21.82 4 3Z\"/>",
    "hidden": true
  },
  "interface-file-check-file-common-check": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12.5 12.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h5l5 5Z\"/><path d=\"m4.5 8.5l1.5 1l2.5-4\"/></g>",
    "hidden": true
  },
  "interface-file-clipboard-work-plain-clipboard-task-list-company-office": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9.5 1.5H11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h1.5\"/><rect width=\"5\" height=\"2.5\" x=\"4.5\" y=\".5\" rx=\"1\"/></g>",
    "hidden": true
  },
  "interface-file-text-text-common-file": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M12.5 12.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h5l5 5Zm-8-8h2m-2 3h5m-5 3h5\"/>",
    "hidden": true
  },
  "interface-help-question-circle-circle-faq-frame-help-info-mark-more-query-question": {
    "body": "<circle cx=\"7\" cy=\"7\" r=\"6.5\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5.5 5.5A1.5 1.5 0 1 1 7 7v1\"/><path fill=\"currentColor\" d=\"M7 9.5a.75.75 0 1 0 .75.75A.76.76 0 0 0 7 9.5Z\"/>",
    "hidden": true
  },
  "interface-layout-1-column-layout-layouts-left-sidebar": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"13\" height=\"13\" x=\".5\" y=\".5\" rx=\"1\" transform=\"rotate(180 7 7)\"/><path d=\"M5.5.5v13m0-6.5h8\"/></g>",
    "hidden": true
  },
  "interface-layout-11-column-layout-layouts-left-sidebar": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"13\" height=\"13\" x=\".5\" y=\".5\" rx=\"1\"/><path d=\"M4.5.5v13m0-6.5h9\"/></g>",
    "hidden": true
  },
  "interface-search-glass-search-magnifying": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"5.92\" cy=\"5.92\" r=\"5.42\"/><path d=\"M13.5 13.5L9.75 9.75\"/></g>",
    "hidden": true
  },
  "interface-setting-menu-1-button-parallel-horizontal-lines-menu-navigation-three-hamburger": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M13.5 2H.5m13 5H.5m13 5H.5\"/>",
    "hidden": true
  },
  "interface-setting-menu-horizontal-navigation-dots-three-circle-button-horizontal-menu": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"7\" r=\"1.5\"/><circle cx=\"7\" cy=\"7\" r=\"1.5\"/><circle cx=\"2\" cy=\"7\" r=\"1.5\"/></g>",
    "hidden": true
  },
  "interface-setting-slider-horizontal-adjustment-adjust-controls-fader-horizontal-settings-slider": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"2\" cy=\"2\" r=\"1.5\"/><path d=\"M3.5 2h10\"/><circle cx=\"7\" cy=\"7\" r=\"1.5\"/><path d=\"M.5 7h5m3 0h5\"/><circle cx=\"12\" cy=\"12\" r=\"1.5\"/><path d=\"M10.5 12H.5\"/></g>",
    "hidden": true
  },
  "interface-signal-square-heart-line-stats-beat-square-graph": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"13\" height=\"13\" x=\".5\" y=\".5\" rx=\"3\"/><path d=\"M2.5 7.02h2L6 4.51l1.5 5.5l2-2.99h2\"/></g>",
    "hidden": true
  },
  "interface-text-formatting-bold-text-bold-formatting-format": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M11 3.5a3 3 0 0 0-3-3H4a1 1 0 0 0-1 1v5h5a3 3 0 0 0 3-3Zm1 6.5a3.5 3.5 0 0 1-3.5 3.5H4a1 1 0 0 1-1-1v-6h5.5A3.5 3.5 0 0 1 12 10Z\"/>",
    "hidden": true
  },
  "interface-text-formatting-italic-text-formatting-italic-format": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m4.5 13.5l5-13m-4 0H13m-12 13h7.5\"/>",
    "hidden": true
  },
  "interface-text-formatting-list-bullets-points-bullet-unordered-list-lists-bullets": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"1\" cy=\"2.5\" r=\".5\"/><path d=\"M4.5 2.5h9\"/><circle cx=\"1\" cy=\"7\" r=\".5\"/><path d=\"M4.5 7h9\"/><circle cx=\"1\" cy=\"11.5\" r=\".5\"/><path d=\"M4.5 11.5h9\"/></g>",
    "hidden": true
  },
  "interface-text-formatting-quotation-1-quote-quotation-format-formatting-open-close-marks-text": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M1.07 7a3.82 3.82 0 0 1 0-4m3.01 4a3.82 3.82 0 0 1 0-4m8.85 8a3.82 3.82 0 0 0 0-4m-3.01 4a3.82 3.82 0 0 0 0-4\"/>",
    "hidden": true
  },
  "interface-validation-check-circle-checkmark-addition-circle-success-check-validation-add-form": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m4 8l2.05 1.64a.48.48 0 0 0 .4.1a.5.5 0 0 0 .34-.24L10 4\"/><circle cx=\"7\" cy=\"7\" r=\"6.5\"/></g>",
    "hidden": true
  },
  "justice-scale-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5.5 9.5L3 4L.5 9.5m5 0a2.5 2.5 0 0 1-5 0m5 0h-5m13 0L11 4L8.5 9.5m5 0a2.5 2.5 0 0 1-5 0m5 0h-5M1.5 4h11M7 4V2\"/>"
  },
  "key": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5.62 7.38L11.5 1.5l2 2m-4.25.25L11 5.5\"/><path d=\"M3.5 12.5a3 3 0 1 0 0-6a3 3 0 0 0 0 6\"/></g>"
  },
  "linkedin": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M3.574 1.767a1.316 1.316 0 0 1-1.287 1.326A1.346 1.346 0 0 1 .99 1.767A1.326 1.326 0 0 1 2.287.5a1.316 1.316 0 0 1 1.287 1.267M1.129 5.449c0-.762.485-.643 1.158-.643s1.148-.119 1.148.643v7.424c0 .772-.485.614-1.148.614s-1.158.158-1.158-.614zm4.306.001c0-.426.158-.585.405-.634s1.1 0 1.396 0c.297 0 .416.485.406.851a2.49 2.49 0 0 1 2.217-.99a2.97 2.97 0 0 1 3.148 3.098v5.068c0 .772-.475.614-1.149.614s-1.148.158-1.148-.614V8.884A1.425 1.425 0 0 0 9.206 7.34A1.435 1.435 0 0 0 7.74 8.914v3.959c0 .772-.485.614-1.158.614s-1.148.158-1.148-.614z\"/>"
  },
  "logout-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M9.5 10.5v2a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v2M6.5 7h7m-2-2l2 2l-2 2\"/>"
  },
  "magic-wand-2": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m12.64 1.87l-.84 2.48a.41.41 0 0 0 0 .37l1.57 2.1a.4.4 0 0 1-.33.64h-2.62a.43.43 0 0 0-.33.17l-1.46 2.1a.4.4 0 0 1-.71-.11l-.78-2.5a.38.38 0 0 0-.26-.26l-2.5-.78a.4.4 0 0 1-.11-.71l2.14-1.51a.43.43 0 0 0 .17-.33V.91a.4.4 0 0 1 .6-.33l2.1 1.57a.41.41 0 0 0 .37.05l2.48-.84a.4.4 0 0 1 .51.51m-5.6 5.09L.5 13.5\"/>"
  },
  "mail-chat-bubble-square-messages-message-bubble-chat-square": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m4.5 12.5l-4 1l1-3v-9a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1Z\"/>",
    "hidden": true
  },
  "mail-incoming": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.5 4L7 6.5L9.5 4M7 .5v6\"/><path d=\"M12 4.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1\"/><path d=\"M1 5.76L7 10l6-4.24\"/></g>"
  },
  "money-graph-bar-product-data-bars-analysis-analytics-graph-business-chart": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M.5 13.5h13m-9 0V.5h-4v13m8 0v-7h-4v7m8 0v-10h-4v10\"/>",
    "hidden": true
  },
  "moon-cloud": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M7.67 2.5A3 3 0 0 1 10.673.505a2 2 0 1 0 2.824 2.824q.004.084.004.171a3 3 0 0 1-2 2.83M11 8.5a2.5 2.5 0 0 0-1.5.5A4.5 4.5 0 1 0 5 13.5h6a2.5 2.5 0 0 0 0-5\"/>"
  },
  "multiple-file-2": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 2.5H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1M4 5h4M4 7.5h4M4 10h2\"/><path d=\"M4.5.5H11a1 1 0 0 1 1 1V11\"/></g>"
  },
  "new-file": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12.5 12.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1H9L12.5 4z\"/><path d=\"M8.5.5v4h4\"/></g>"
  },
  "office-building-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M8.461 4.75V1.594c0-.56-.454-1.015-1.015-1.015h-4.79c-.562 0-1.016.454-1.016 1.015v11.827m-1.121 0h4.968M1.64 3.187H4.1M1.64 5.75h3.847m4.993 4.282a1.75 1.75 0 1 0 0-3.5a1.75 1.75 0 0 0 0 3.5m-3.001 3.389a3.04 3.04 0 0 1 .39-1.46a3.03 3.03 0 0 1 2.611-1.537a3.03 3.03 0 0 1 2.612 1.538c.25.445.385.947.39 1.459\"/>"
  },
  "open-book": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M7 13.5a9.26 9.26 0 0 0-5.61-2.95a1 1 0 0 1-.89-1V1.5A1 1 0 0 1 1.64.51A9.3 9.3 0 0 1 7 3.43zm0 0a9.26 9.26 0 0 1 5.61-2.95a1 1 0 0 0 .89-1V1.5a1 1 0 0 0-1.14-.99A9.3 9.3 0 0 0 7 3.43z\"/>"
  },
  "paragraph": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M13.5.5h-9a4 4 0 0 0 0 8h2m3-8v13m-3-13v13\"/>"
  },
  "phone": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5.248 12.982a3.184 3.184 0 0 1-3.992-.44l-.449-.438a1.08 1.08 0 0 1 0-1.507L2.713 8.71a1.07 1.07 0 0 1 1.497 0a1.08 1.08 0 0 0 1.507 0L8.71 5.717a1.06 1.06 0 0 0 0-1.507a1.07 1.07 0 0 1 0-1.497L10.607.817a1.08 1.08 0 0 1 1.507 0l.439.45a3.184 3.184 0 0 1 .439 3.99a28.9 28.9 0 0 1-7.744 7.725\"/>"
  },
  "receipt": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7.202 4.722a1.33 1.33 0 0 0-1.258-.889H4.912a1.19 1.19 0 0 0-.254 2.353l1.571.344a1.334 1.334 0 0 1-.285 2.637h-.888a1.33 1.33 0 0 1-1.258-.89M5.5 3.833V2.5m0 8V9.167\"/><path d=\"M12 .5H2.5a2 2 0 0 0-2 2v11L3 12l2.5 1.5L8 12l2.5 1.5V2a1.5 1.5 0 1 1 3 0v3.5h-3\"/></g>"
  },
  "ringing-bell-notification": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M6 13.25h2m3-7.5a4 4 0 1 0-8 0v3.5a1.5 1.5 0 0 1-1.5 1.5h11a1.5 1.5 0 0 1-1.5-1.5zM.5 5.62A6 6 0 0 1 3 .75m10.5 4.87A6 6 0 0 0 11 .75\"/>"
  },
  "school-bus-side": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11.625 11.492h.802a1 1 0 0 0 1-1V7.957a1 1 0 0 0-1-1h-.552V3.375a1 1 0 0 0-1-1h-9.19a1 1 0 0 0-1 1v7.26c0 .473.384.857.857.857H2m9.875-7.283H.685m11.19 2.748H.685m3.779-2.748v2.744m3.567-2.744v2.744\"/><path d=\"M1.994 11.478a1.396 1.396 0 1 0 2.792 0a1.396 1.396 0 1 0-2.792 0m6.84 0a1.396 1.396 0 1 0 2.792 0a1.396 1.396 0 1 0-2.792 0m-4.048 0h4.048\"/></g>"
  },
  "send-email": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m5.812 11l2.178 2.17a1.1 1.1 0 0 0 1.05.3a1.12 1.12 0 0 0 .809-.74l3.576-10.72A1.118 1.118 0 0 0 11.987.57L1.267 4.147a1.12 1.12 0 0 0-.74.859a1.1 1.1 0 0 0 .3 1l2.737 2.737l-.09 3.466zM13.106.79L3.564 8.742\"/>"
  },
  "share-link": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M2.75 9.25a2.25 2.25 0 1 0 0-4.5a2.25 2.25 0 0 0 0 4.5m8.5 4.25a2.25 2.25 0 1 0 0-4.5a2.25 2.25 0 0 0 0 4.5m0-8.5a2.25 2.25 0 1 0 0-4.5a2.25 2.25 0 0 0 0 4.5M4.76 6l4.48-2.25M4.76 8l4.48 2.25\"/>"
  },
  "shield-check": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7.354 13.384a1 1 0 0 1-.714 0v0A9.49 9.49 0 0 1 .55 4.517V1.542A.99.99 0 0 1 1.542.55h10.91a.99.99 0 0 1 .991.992v2.975a9.49 9.49 0 0 1-6.09 8.867\"/><path d=\"M10 4L6 8.5L4 7\"/></g>"
  },
  "shopping-bag-suitcase-1-product-business-briefcase": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"13\" height=\"10\" x=\".5\" y=\"3.5\" rx=\"1\"/><path d=\"M5 .5h4a1 1 0 0 1 1 1v2h0h-6h0v-2a1 1 0 0 1 1-1ZM3.5 7h7m-7 3h7\"/></g>",
    "hidden": true
  },
  "square-clock": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8\"/><path d=\"M7 5.5V7h1.5\"/><path d=\"M12.5.5h-11a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1\"/></g>"
  },
  "star-1": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M7.49 1.09L9.08 4.3a.51.51 0 0 0 .41.3l3.51.52a.54.54 0 0 1 .3.93l-2.53 2.51a.53.53 0 0 0-.16.48l.61 3.53a.55.55 0 0 1-.8.58l-3.16-1.67a.59.59 0 0 0-.52 0l-3.16 1.67a.55.55 0 0 1-.8-.58L3.39 9a.53.53 0 0 0-.16-.48L.67 6.05A.54.54 0 0 1 1 5.12l3.51-.52a.51.51 0 0 0 .41-.3l1.59-3.21a.54.54 0 0 1 .98 0\"/>"
  },
  "stethoscope": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9.625 4.27a1.738 1.738 0 1 0 3.388.776a1.738 1.738 0 1 0-3.388-.776M1.74 1.656H.645V5.25a3.22 3.22 0 0 0 3.218 3.219v0a3.22 3.22 0 0 0 3.22-3.219V1.656H5.989\"/><path d=\"M3.927 8.5v1.208a3.7 3.7 0 0 0 3.698 3.698v0a3.7 3.7 0 0 0 3.699-3.698V6.594\"/></g>"
  },
  "table-lamp-1": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.5 3V1.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1V3a4 4 0 0 0-2 3.5h8a4 4 0 0 0-2-3.5\"/><path d=\"M6.5 1.5H8a4 4 0 0 1 4 4v8m1.5 0h-6\"/></g>"
  },
  "task-list": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11.719 12.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h5.586a1 1 0 0 1 .707.293l3.414 3.414a1 1 0 0 1 .293.707zM6.777 6.375h2.5m-2.5 3.469h2.5\"/><path d=\"m2.91 9.787l.838.838L5.145 8.67M2.91 6.256l.838.838l1.397-1.955\"/></g>"
  },
  "travel-hotel-bed-2-bed-double-bedroom-bedrooms-queen-king-full-hotel": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"13\" height=\"13\" x=\".5\" y=\".5\" rx=\"1\"/><path d=\"M7 3.5H3v-3m8 0v3H7v-3M.5 6h13\"/></g>",
    "hidden": true
  },
  "travel-map-earth-1-planet-earth-globe-world": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"7\" cy=\"7\" r=\"6.5\"/><path d=\"M1 9.5h1.75A1.75 1.75 0 0 0 4.5 7.75v-1.5A1.75 1.75 0 0 1 6.25 4.5A1.75 1.75 0 0 0 8 2.75V.57m5.5 6.33a3.56 3.56 0 0 0-1.62-.4H9.75a1.75 1.75 0 0 0 0 3.5A1.25 1.25 0 0 1 11 11.25v.87\"/></g>",
    "hidden": true
  },
  "travel-map-location-pin-navigation-map-maps-pin-gps-location": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11.5 5c0 2.49-4.5 8.5-4.5 8.5S2.5 7.49 2.5 5a4.5 4.5 0 0 1 9 0Z\"/><circle cx=\"7\" cy=\"5\" r=\"1.5\"/></g>",
    "hidden": true
  },
  "upload-file": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12.5 12.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1H9L12.5 4z\"/><path d=\"m9 6.5l-2-2l-2 2m2-2V10\"/></g>"
  },
  "user-circle-single": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 8a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m-4.27 3.9a5 5 0 0 1 8.54 0\"/><path d=\"M7 13.5a6.5 6.5 0 1 0 0-13a6.5 6.5 0 0 0 0 13\"/></g>"
  },
  "user-multiple-circle": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10.438 8a1.61 1.61 0 1 1 0-3.22a1.61 1.61 0 0 1 0 3.22m-2.339 2.485a3.22 3.22 0 0 1 4.494-.18M5.229 7.483a1.995 1.995 0 1 1 0-3.99a1.995 1.995 0 0 1 0 3.99\"/><path d=\"M8.967 13.181c-.1-1.192-.397-1.975-.56-2.251a3.95 3.95 0 0 0-1.414-1.414A3.8 3.8 0 0 0 5.09 9a3.8 3.8 0 0 0-1.903.516c-.463.27-.867.634-1.188 1.07l-.203.305\"/><path d=\"M7 13.5a6.5 6.5 0 1 1 0-13a6.5 6.5 0 0 1 0 13\"/></g>"
  },
  "user-multiple-group": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5 6.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m-4.5 7h9v-.542A4.51 4.51 0 0 0 4.796 8.5A4.51 4.51 0 0 0 .5 12.958zm8.5-7a2.5 2.5 0 0 0 0-5m2.5 12h2v-.542A4.51 4.51 0 0 0 10 8.61\"/>"
  },
  "warning-octagon": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9.793 13.207a1 1 0 0 1-.707.293H4.914a1 1 0 0 1-.707-.293L.793 9.793A1 1 0 0 1 .5 9.086V4.914a1 1 0 0 1 .293-.707L4.207.793A1 1 0 0 1 4.914.5h4.172a1 1 0 0 1 .707.293l3.414 3.414a1 1 0 0 1 .293.707v4.172a1 1 0 0 1-.293.707zM7 4v3.25\"/><path d=\"M7 10a.25.25 0 0 1 0-.5m0 .5a.25.25 0 0 0 0-.5\"/></g>"
  },
  "warning-triangle": {
    "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7.89 1.05a1 1 0 0 0-1.78 0l-5.5 11a1 1 0 0 0 .89 1.45h11a1 1 0 0 0 .89-1.45zM7 5v3.25\"/><path d=\"M7 11a.25.25 0 1 1 0-.5m0 .5a.25.25 0 1 0 0-.5\"/></g>"
  }
};

const ICON_NAME_BY_EXPORT = {
  Activity: "heart-rate-pulse-graph",
  ActivitySquare: "interface-signal-square-heart-line-stats-beat-square-graph",
  AlertCircle: "interface-alert-warning-circle-warning-alert-frame-exclamation-caution-circle",
  AlertTriangle: "warning-triangle",
  ArrowDown: "arrow-down-2",
  ArrowLeft: "arrow-round-left",
  ArrowRight: "arrow-right-1",
  ArrowUp: "arrow-up-1",
  ArrowUpDown: "arrow-curvy-up-down-1",
  BedDouble: "travel-hotel-bed-2-bed-double-bedroom-bedrooms-queen-king-full-hotel",
  Bell: "ringing-bell-notification",
  Bold: "interface-text-formatting-bold-text-bold-formatting-format",
  BookOpen: "open-book",
  BookOpenCheck: "open-book",
  BookmarkPlus: "bookmark",
  Bot: "computer-robot-cyborg-artificial-robotics-robot-intelligence-machine-technology-android",
  Briefcase: "shopping-bag-suitcase-1-product-business-briefcase",
  BriefcaseBusiness: "business-profession-home-office",
  Building: "building-2",
  Building2: "office-building-1",
  Calculator: "calculator-1",
  Calendar: "blank-calendar",
  CalendarCheck: "interface-calendar-check-approve-calendar-check-date-day-month-success",
  CalendarClock: "square-clock",
  CalendarDays: "interface-calendar-blank-calendar-date-day-month",
  ChartNoAxesColumn: "money-graph-bar-product-data-bars-analysis-analytics-graph-business-chart",
  Check: "check",
  CheckCircle2: "interface-validation-check-circle-checkmark-addition-circle-success-check-validation-add-form",
  CheckIcon: "check",
  ChevronDown: "interface-arrows-down-arrow-down-keyboard",
  ChevronDownIcon: "interface-arrows-down-arrow-down-keyboard",
  ChevronLeft: "interface-arrows-left-arrow-keyboard-left",
  ChevronRight: "interface-arrows-right-arrow-right-keyboard",
  ChevronRightIcon: "interface-arrows-right-arrow-right-keyboard",
  ChevronUpIcon: "interface-arrows-button-up-arrow-up-keyboard",
  CircleCheck: "interface-validation-check-circle-checkmark-addition-circle-success-check-validation-add-form",
  CircleGauge: "dashboard-circle",
  CircleIcon: "circle",
  ClipboardCheck: "clipboard-check",
  ClipboardList: "interface-file-clipboard-work-plain-clipboard-task-list-company-office",
  Clock: "alarm-clock",
  Clock3: "circle-clock",
  Compass: "compass-navigator",
  CreditCard: "credit-card-1",
  ExternalLink: "share-link",
  Eye: "eye-optic",
  EyeOff: "interface-edit-view-off-disable-eye-eyeball-hide-off-view",
  Facebook: "facebook-1",
  FileBadge2: "new-file",
  FileCheck2: "interface-file-check-file-common-check",
  FileStack: "multiple-file-2",
  FileText: "interface-file-text-text-common-file",
  Globe: "travel-map-earth-1-planet-earth-globe-world",
  GraduationCap: "graduation-cap",
  Handshake: "business-handshake",
  Heading2: "heading-2-paragraph-styles-heading",
  Heading3: "heading-3-paragraph-styles-heading",
  HeartHandshake: "interface-favorite-give-heart-reward-social-rating-media-heart-hand",
  HelpCircle: "interface-help-question-circle-circle-faq-frame-help-info-mark-more-query-question",
  Home: "home-3",
  Image: "edit-image-photo",
  ImageIcon: "image-picture-gallery-pages-filter-picture-pagination-image",
  Instagram: "instagram",
  Italic: "interface-text-formatting-italic-text-formatting-italic-format",
  Key: "key",
  LaptopMinimalCheck: "desktop-check",
  LayoutDashboard: "interface-dashboard-layout-3-app-application-dashboard-home-layout",
  Linkedin: "linkedin",
  List: "bullet-list",
  ListFilter: "filter-2",
  ListOrdered: "interface-text-formatting-list-bullets-points-bullet-unordered-list-lists-bullets",
  ListTodo: "task-list",
  Loader2: "interface-arrows-synchronize-arrows-loading-load-sync-synchronize-arrow-reload",
  LogOut: "logout-1",
  Mail: "mail-incoming",
  MapPin: "travel-map-location-pin-navigation-map-maps-pin-gps-location",
  Menu: "interface-setting-menu-1-button-parallel-horizontal-lines-menu-navigation-three-hamburger",
  MessageCircle: "mail-chat-bubble-square-messages-message-bubble-chat-square",
  Moon: "moon-cloud",
  MoreHorizontal: "interface-setting-menu-horizontal-navigation-dots-three-circle-button-horizontal-menu",
  Newspaper: "entertainment-news-paper-newspaper-periodical-fold-content",
  NotebookPen: "interface-content-book-edit-pencil-content-write-notebook-book-edit-composition-creation",
  PanelLeftClose: "interface-layout-1-column-layout-layouts-left-sidebar",
  PanelLeftOpen: "interface-layout-11-column-layout-layouts-left-sidebar",
  Phone: "phone",
  PhoneCall: "incoming-call",
  Pilcrow: "paragraph",
  PlayCircle: "entertainment-control-button-play-circle-controls-media-multi-play-multimedia-button-circle",
  Quote: "interface-text-formatting-quotation-1-quote-quotation-format-formatting-open-close-marks-text",
  ReceiptText: "receipt",
  Scale: "justice-scale-1",
  School: "school-bus-side",
  Search: "interface-search-glass-search-magnifying",
  Send: "send-email",
  SendHorizonal: "interface-arrows-button-right-arrow-right-keyboard",
  Settings: "cog",
  ShieldAlert: "warning-octagon",
  ShieldCheck: "shield-check",
  SlidersHorizontal: "interface-setting-slider-horizontal-adjustment-adjust-controls-fader-horizontal-settings-slider",
  Sparkles: "ai-chip-spark",
  Star: "star-1",
  Stethoscope: "stethoscope",
  TableProperties: "table-lamp-1",
  Trash2: "interface-delete-bin-1-remove-delete-empty-bin-trash-garbage",
  Upload: "upload-file",
  User: "user-circle-single",
  UserCircle2: "user-circle-single",
  UserRound: "user-circle-single",
  Users: "user-multiple-group",
  UsersRound: "user-multiple-circle",
  WandSparkles: "magic-wand-2",
  X: "delete-1",
  XIcon: "delete-1",
} as const;

function createIcon(displayName: string, iconName: string): LucideIcon {
  const icon = ICON_DATA[iconName] ?? ICON_DATA.circle;

  const Component = React.forwardRef<SVGSVGElement, LucideProps>(function StreamlineIcon(
    {
      size = 24,
      color,
      absoluteStrokeWidth: _absoluteStrokeWidth,
      strokeWidth: _strokeWidth,
      dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
      children: _children,
      ...props
    },
    ref
  ) {
    void _absoluteStrokeWidth;
    void _strokeWidth;
    void _dangerouslySetInnerHTML;
    void _children;

    const hasAccessibleLabel =
      typeof props['aria-label'] === 'string' || typeof props['aria-labelledby'] === 'string';

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={`0 0 ${icon.width ?? DEFAULT_ICON_WIDTH} ${icon.height ?? DEFAULT_ICON_HEIGHT}`}
        color={color}
        role={hasAccessibleLabel ? 'img' : 'presentation'}
        aria-hidden={hasAccessibleLabel ? undefined : true}
        focusable="false"
        {...props}
        dangerouslySetInnerHTML={{ __html: icon.body }}
      />
    );
  });

  Component.displayName = displayName;
  return Component;
}

export const Activity = createIcon("Activity", ICON_NAME_BY_EXPORT.Activity);
export const ActivitySquare = createIcon("ActivitySquare", ICON_NAME_BY_EXPORT.ActivitySquare);
export const AlertCircle = createIcon("AlertCircle", ICON_NAME_BY_EXPORT.AlertCircle);
export const AlertTriangle = createIcon("AlertTriangle", ICON_NAME_BY_EXPORT.AlertTriangle);
export const ArrowDown = createIcon("ArrowDown", ICON_NAME_BY_EXPORT.ArrowDown);
export const ArrowLeft = createIcon("ArrowLeft", ICON_NAME_BY_EXPORT.ArrowLeft);
export const ArrowRight = createIcon("ArrowRight", ICON_NAME_BY_EXPORT.ArrowRight);
export const ArrowUp = createIcon("ArrowUp", ICON_NAME_BY_EXPORT.ArrowUp);
export const ArrowUpDown = createIcon("ArrowUpDown", ICON_NAME_BY_EXPORT.ArrowUpDown);
export const BedDouble = createIcon("BedDouble", ICON_NAME_BY_EXPORT.BedDouble);
export const Bell = createIcon("Bell", ICON_NAME_BY_EXPORT.Bell);
export const Bold = createIcon("Bold", ICON_NAME_BY_EXPORT.Bold);
export const BookOpen = createIcon("BookOpen", ICON_NAME_BY_EXPORT.BookOpen);
export const BookOpenCheck = createIcon("BookOpenCheck", ICON_NAME_BY_EXPORT.BookOpenCheck);
export const BookmarkPlus = createIcon("BookmarkPlus", ICON_NAME_BY_EXPORT.BookmarkPlus);
export const Bot = createIcon("Bot", ICON_NAME_BY_EXPORT.Bot);
export const Briefcase = createIcon("Briefcase", ICON_NAME_BY_EXPORT.Briefcase);
export const BriefcaseBusiness = createIcon("BriefcaseBusiness", ICON_NAME_BY_EXPORT.BriefcaseBusiness);
export const Building = createIcon("Building", ICON_NAME_BY_EXPORT.Building);
export const Building2 = createIcon("Building2", ICON_NAME_BY_EXPORT.Building2);
export const Calculator = createIcon("Calculator", ICON_NAME_BY_EXPORT.Calculator);
export const Calendar = createIcon("Calendar", ICON_NAME_BY_EXPORT.Calendar);
export const CalendarCheck = createIcon("CalendarCheck", ICON_NAME_BY_EXPORT.CalendarCheck);
export const CalendarClock = createIcon("CalendarClock", ICON_NAME_BY_EXPORT.CalendarClock);
export const CalendarDays = createIcon("CalendarDays", ICON_NAME_BY_EXPORT.CalendarDays);
export const ChartNoAxesColumn = createIcon("ChartNoAxesColumn", ICON_NAME_BY_EXPORT.ChartNoAxesColumn);
export const Check = createIcon("Check", ICON_NAME_BY_EXPORT.Check);
export const CheckCircle2 = createIcon("CheckCircle2", ICON_NAME_BY_EXPORT.CheckCircle2);
export const CheckIcon = createIcon("CheckIcon", ICON_NAME_BY_EXPORT.CheckIcon);
export const ChevronDown = createIcon("ChevronDown", ICON_NAME_BY_EXPORT.ChevronDown);
export const ChevronDownIcon = createIcon("ChevronDownIcon", ICON_NAME_BY_EXPORT.ChevronDownIcon);
export const ChevronLeft = createIcon("ChevronLeft", ICON_NAME_BY_EXPORT.ChevronLeft);
export const ChevronRight = createIcon("ChevronRight", ICON_NAME_BY_EXPORT.ChevronRight);
export const ChevronRightIcon = createIcon("ChevronRightIcon", ICON_NAME_BY_EXPORT.ChevronRightIcon);
export const ChevronUpIcon = createIcon("ChevronUpIcon", ICON_NAME_BY_EXPORT.ChevronUpIcon);
export const CircleCheck = createIcon("CircleCheck", ICON_NAME_BY_EXPORT.CircleCheck);
export const CircleGauge = createIcon("CircleGauge", ICON_NAME_BY_EXPORT.CircleGauge);
export const CircleIcon = createIcon("CircleIcon", ICON_NAME_BY_EXPORT.CircleIcon);
export const ClipboardCheck = createIcon("ClipboardCheck", ICON_NAME_BY_EXPORT.ClipboardCheck);
export const ClipboardList = createIcon("ClipboardList", ICON_NAME_BY_EXPORT.ClipboardList);
export const Clock = createIcon("Clock", ICON_NAME_BY_EXPORT.Clock);
export const Clock3 = createIcon("Clock3", ICON_NAME_BY_EXPORT.Clock3);
export const Compass = createIcon("Compass", ICON_NAME_BY_EXPORT.Compass);
export const CreditCard = createIcon("CreditCard", ICON_NAME_BY_EXPORT.CreditCard);
export const ExternalLink = createIcon("ExternalLink", ICON_NAME_BY_EXPORT.ExternalLink);
export const Eye = createIcon("Eye", ICON_NAME_BY_EXPORT.Eye);
export const EyeOff = createIcon("EyeOff", ICON_NAME_BY_EXPORT.EyeOff);
export const Facebook = createIcon("Facebook", ICON_NAME_BY_EXPORT.Facebook);
export const FileBadge2 = createIcon("FileBadge2", ICON_NAME_BY_EXPORT.FileBadge2);
export const FileCheck2 = createIcon("FileCheck2", ICON_NAME_BY_EXPORT.FileCheck2);
export const FileStack = createIcon("FileStack", ICON_NAME_BY_EXPORT.FileStack);
export const FileText = createIcon("FileText", ICON_NAME_BY_EXPORT.FileText);
export const Globe = createIcon("Globe", ICON_NAME_BY_EXPORT.Globe);
export const GraduationCap = createIcon("GraduationCap", ICON_NAME_BY_EXPORT.GraduationCap);
export const Handshake = createIcon("Handshake", ICON_NAME_BY_EXPORT.Handshake);
export const Heading2 = createIcon("Heading2", ICON_NAME_BY_EXPORT.Heading2);
export const Heading3 = createIcon("Heading3", ICON_NAME_BY_EXPORT.Heading3);
export const HeartHandshake = createIcon("HeartHandshake", ICON_NAME_BY_EXPORT.HeartHandshake);
export const HelpCircle = createIcon("HelpCircle", ICON_NAME_BY_EXPORT.HelpCircle);
export const Home = createIcon("Home", ICON_NAME_BY_EXPORT.Home);
export const Image = createIcon("Image", ICON_NAME_BY_EXPORT.Image);
export const ImageIcon = createIcon("ImageIcon", ICON_NAME_BY_EXPORT.ImageIcon);
export const Instagram = createIcon("Instagram", ICON_NAME_BY_EXPORT.Instagram);
export const Italic = createIcon("Italic", ICON_NAME_BY_EXPORT.Italic);
export const Key = createIcon("Key", ICON_NAME_BY_EXPORT.Key);
export const LaptopMinimalCheck = createIcon("LaptopMinimalCheck", ICON_NAME_BY_EXPORT.LaptopMinimalCheck);
export const LayoutDashboard = createIcon("LayoutDashboard", ICON_NAME_BY_EXPORT.LayoutDashboard);
export const Linkedin = createIcon("Linkedin", ICON_NAME_BY_EXPORT.Linkedin);
export const List = createIcon("List", ICON_NAME_BY_EXPORT.List);
export const ListFilter = createIcon("ListFilter", ICON_NAME_BY_EXPORT.ListFilter);
export const ListOrdered = createIcon("ListOrdered", ICON_NAME_BY_EXPORT.ListOrdered);
export const ListTodo = createIcon("ListTodo", ICON_NAME_BY_EXPORT.ListTodo);
export const Loader2 = createIcon("Loader2", ICON_NAME_BY_EXPORT.Loader2);
export const LogOut = createIcon("LogOut", ICON_NAME_BY_EXPORT.LogOut);
export const Mail = createIcon("Mail", ICON_NAME_BY_EXPORT.Mail);
export const MapPin = createIcon("MapPin", ICON_NAME_BY_EXPORT.MapPin);
export const Menu = createIcon("Menu", ICON_NAME_BY_EXPORT.Menu);
export const MessageCircle = createIcon("MessageCircle", ICON_NAME_BY_EXPORT.MessageCircle);
export const Moon = createIcon("Moon", ICON_NAME_BY_EXPORT.Moon);
export const MoreHorizontal = createIcon("MoreHorizontal", ICON_NAME_BY_EXPORT.MoreHorizontal);
export const Newspaper = createIcon("Newspaper", ICON_NAME_BY_EXPORT.Newspaper);
export const NotebookPen = createIcon("NotebookPen", ICON_NAME_BY_EXPORT.NotebookPen);
export const PanelLeftClose = createIcon("PanelLeftClose", ICON_NAME_BY_EXPORT.PanelLeftClose);
export const PanelLeftOpen = createIcon("PanelLeftOpen", ICON_NAME_BY_EXPORT.PanelLeftOpen);
export const Phone = createIcon("Phone", ICON_NAME_BY_EXPORT.Phone);
export const PhoneCall = createIcon("PhoneCall", ICON_NAME_BY_EXPORT.PhoneCall);
export const Pilcrow = createIcon("Pilcrow", ICON_NAME_BY_EXPORT.Pilcrow);
export const PlayCircle = createIcon("PlayCircle", ICON_NAME_BY_EXPORT.PlayCircle);
export const Quote = createIcon("Quote", ICON_NAME_BY_EXPORT.Quote);
export const ReceiptText = createIcon("ReceiptText", ICON_NAME_BY_EXPORT.ReceiptText);
export const Scale = createIcon("Scale", ICON_NAME_BY_EXPORT.Scale);
export const School = createIcon("School", ICON_NAME_BY_EXPORT.School);
export const Search = createIcon("Search", ICON_NAME_BY_EXPORT.Search);
export const Send = createIcon("Send", ICON_NAME_BY_EXPORT.Send);
export const SendHorizonal = createIcon("SendHorizonal", ICON_NAME_BY_EXPORT.SendHorizonal);
export const Settings = createIcon("Settings", ICON_NAME_BY_EXPORT.Settings);
export const ShieldAlert = createIcon("ShieldAlert", ICON_NAME_BY_EXPORT.ShieldAlert);
export const ShieldCheck = createIcon("ShieldCheck", ICON_NAME_BY_EXPORT.ShieldCheck);
export const SlidersHorizontal = createIcon("SlidersHorizontal", ICON_NAME_BY_EXPORT.SlidersHorizontal);
export const Sparkles = createIcon("Sparkles", ICON_NAME_BY_EXPORT.Sparkles);
export const Star = createIcon("Star", ICON_NAME_BY_EXPORT.Star);
export const Stethoscope = createIcon("Stethoscope", ICON_NAME_BY_EXPORT.Stethoscope);
export const TableProperties = createIcon("TableProperties", ICON_NAME_BY_EXPORT.TableProperties);
export const Trash2 = createIcon("Trash2", ICON_NAME_BY_EXPORT.Trash2);
export const Upload = createIcon("Upload", ICON_NAME_BY_EXPORT.Upload);
export const User = createIcon("User", ICON_NAME_BY_EXPORT.User);
export const UserCircle2 = createIcon("UserCircle2", ICON_NAME_BY_EXPORT.UserCircle2);
export const UserRound = createIcon("UserRound", ICON_NAME_BY_EXPORT.UserRound);
export const Users = createIcon("Users", ICON_NAME_BY_EXPORT.Users);
export const UsersRound = createIcon("UsersRound", ICON_NAME_BY_EXPORT.UsersRound);
export const WandSparkles = createIcon("WandSparkles", ICON_NAME_BY_EXPORT.WandSparkles);
export const X = createIcon("X", ICON_NAME_BY_EXPORT.X);
export const XIcon = createIcon("XIcon", ICON_NAME_BY_EXPORT.XIcon);
