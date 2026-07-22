// smartagri UI kit — the reusable, presentational surface of the smartagri
// landing site, decoupled from the app's router and data sources so it can be
// composed freely. Brand rules (Inter one-voice type, the teal -> mint palette,
// the mint CTA pill) live in the components' classes and in styles.css.

import { MotionGlobalConfig } from "framer-motion";

// The kit renders at final (visible) state in static and design-canvas
// contexts. The landing site's entrance animations (fade + slide up from
// opacity 0, triggered on scroll-into-view) would otherwise leave components
// invisible until scrolled — wrong for a reusable kit composed in a design
// tool. The animations remain intact in the app's own components.
MotionGlobalConfig.skipAnimations = true;

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant } from "./Button";

export { Eyebrow } from "./Eyebrow";
export type { EyebrowProps } from "./Eyebrow";

export { PageHero } from "./PageHero";
export type { PageHeroProps } from "./PageHero";

export { CallToAction } from "./CallToAction";
export type { CallToActionProps } from "./CallToAction";

export { Impact, stats } from "./Impact";
export type { ImpactProps, ImpactStat } from "./Impact";

export { WorkflowEmbed } from "./WorkflowEmbed";
export type { WorkflowEmbedProps } from "./WorkflowEmbed";

export { PartnerMarquee } from "./PartnerMarquee";
export type { PartnerMarqueeProps, MarqueePartner } from "./PartnerMarquee";

export { TeamCard, MemberPhoto } from "./TeamCard";
export type { TeamCardProps, TeamCardMember } from "./TeamCard";
