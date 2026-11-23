import {
  Bug,
  Building2,
  Cpu,
  CloudRain,
  Droplets,
  FlaskConical,
  Flower2,
  Gauge,
  Layers,
  Leaf,
  MapPin,
  Microscope,
  Recycle,
  Settings2,
  ShieldCheck,
  Sprout,
  Sun,
  Target,
  Thermometer,
  Warehouse,
  Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { localizeAll, type Lang } from "./i18n-core";

// Content model for the Indoor Farming section (/indoor-farming).
//
// One data file drives the whole section: the landing page pillars and every
// hub page (/indoor-farming/<section>). Topics carry their own slug so any of
// them can be promoted to a standalone detail page later by adding a route,
// without restructuring the content.
//
// Positioning: a university research center in the tropics. Copy describes
// expertise, method, and the physics of growing under tropical conditions,
// and invites collaboration. It does not claim delivered commercial projects.

export type IFTopic = {
  /** Stable id: doubles as the in-page anchor and a future detail-page slug. */
  slug: string;
  title: string;
  summary: string;
  points: string[];
};

export type IFGroup = {
  slug: string;
  title: string;
  /** Short blurb shown on the section overview row. */
  intro: string;
  /** Call to action on the overview row, e.g. "Crop feasibility". */
  linkLabel: string;
  icon: LucideIcon;
  /** Longer opening paragraph on the group's own page. */
  lede?: string;
  topics: IFTopic[];
};

export type IFSection = {
  slug: string;
  /** Sub-navigation label. */
  label: string;
  eyebrow: string;
  /** Rendered as `{title} <accent>{accent}</accent>`. */
  title: string;
  accent: string;
  lede: string;
  groups: IFGroup[];
};

export const IF_SECTIONS: IFSection[] = [
  // ---------------------------------------------------------------- approach
  {
    slug: "approach",
    label: "Approach",
    eyebrow: "Approach",
    title: "The decisions that come",
    accent: "before the build",
    lede: "Feasibility is worked out, not assumed. Three things decide whether a controlled environment will pay for itself here: the crop, the site, and how much control you actually need.",
    groups: [
      {
        slug: "crop-and-market",
        title: "Crop and market fit",
        intro:
          "Crop choice drives everything downstream: the structure, the climate strategy, the irrigation design, and whether the numbers work at all.",
        linkLabel: "Crop feasibility",
        icon: Sprout,
        topics: [
          {
            slug: "match-the-market",
            title: "Match the crop to the market",
            summary:
              "A controlled environment only pays for itself when the crop commands a premium. The question is not what grows best, it is what sells best near you.",
            points: [
              "Leafy greens and herbs for urban food service, hotels, and modern retail",
              "Tomato and strawberry where consistent grade and year-round supply carry a price premium",
              "Off-season production, when open-field supply drops and prices climb",
            ],
          },
          {
            slug: "match-the-climate",
            title: "Match the crop to the climate",
            summary:
              "Indonesia is not one climate. A crop that thrives on a highland site may need active cooling and dehumidification in the lowlands, which changes the whole capital plan.",
            points: [
              "Highland sites: cool nights do much of the work, so passive ventilation goes further",
              "Lowland sites: heat and humidity are the binding constraints, not cold",
              "Cool-preferring crops (lettuce, strawberry) carry the highest climate cost at low altitude",
            ],
          },
          {
            slug: "cycle-time",
            title: "Cycle time and cash flow",
            summary:
              "Short-cycle crops return cash and, just as importantly, knowledge faster. Long-cycle crops reward operators who already have their protocols under control.",
            points: [
              "Leafy greens turn over in weeks, so a mistake costs one cycle, not one season",
              "Fruiting crops run for months and demand steadier climate and nutrition control",
              "Many operations start short-cycle, then graduate to fruiting crops",
            ],
          },
          {
            slug: "trial-first",
            title: "Prove it in a trial first",
            summary:
              "We would rather run one instrumented season at small scale than design a large facility around assumptions. Trials turn opinions into numbers.",
            points: [
              "A small, fully sensored trial block before committing capital",
              "Measured yield, quality, water, and energy per unit of production",
              "A design brief written from your data, not from a brochure",
            ],
          },
        ],
      },
      {
        slug: "site-and-climate",
        title: "Site and climate",
        intro:
          "Site selection quietly sets your operating cost for the next decade. Altitude, water, power, and distance to market matter more than the shape of the roof.",
        linkLabel: "Site assessment",
        icon: MapPin,
        topics: [
          {
            slug: "altitude",
            title: "Altitude decides your climate strategy",
            summary:
              "Elevation is the single most useful piece of free cooling in the tropics. It determines whether you can ventilate your way to a good climate or must pay to condition the air.",
            points: [
              "Highland: natural ventilation and shading often suffice for much of the year",
              "Mid-altitude: hybrid strategies, with cooling reserved for peak hours",
              "Lowland: expect active cooling and dehumidification in the energy budget",
            ],
          },
          {
            slug: "market-distance",
            title: "Proximity to market",
            summary:
              "Fresh produce loses value by the hour. Being close to the buyer is a quality strategy as much as a logistics one.",
            points: [
              "Shorter cold chains protect shelf life and reduce rejection at delivery",
              "Peri-urban sites trade land cost against freshness and transport",
              "Plant factories can sit closest to the consumer because they need no land quality",
            ],
          },
          {
            slug: "water-and-power",
            title: "Water and power",
            summary:
              "Water quality shapes the entire irrigation design, and power reliability determines how much automation you can safely depend on.",
            points: [
              "Source water tested first: salinity, hardness, iron, and pathogens",
              "Rainwater harvesting as the cleanest and cheapest input where rainfall allows",
              "Grid reliability, backup, and solar potential assessed before sizing controls",
            ],
          },
          {
            slug: "site-and-orientation",
            title: "Site, drainage, and orientation",
            summary:
              "The land itself sets constraints that no controller can override: how water leaves, where wind comes from, and what shades you in the afternoon.",
            points: [
              "Drainage and flood history, especially on converted paddy land",
              "Prevailing wind direction, which drives natural ventilation performance",
              "Orientation and surrounding obstructions that affect light through the day",
            ],
          },
        ],
      },
      {
        slug: "level-of-control",
        title: "Level of control",
        intro:
          "There is a spectrum between an open field and a fully closed plant factory. The right point on it is the one your crop, climate, and team can actually sustain.",
        linkLabel: "System design",
        icon: Target,
        topics: [
          {
            slug: "level-of-control",
            title: "Match the level of control to the goal",
            summary:
              "More control means more capital and more operating skill. The best system is the simplest one that reliably delivers the climate your crop needs.",
            points: [
              "Screenhouse: rain and insect exclusion at the lowest cost",
              "Naturally ventilated greenhouse: real climate influence with modest energy use",
              "Semi-closed greenhouse and plant factory: full control, highest capex and energy",
            ],
          },
          {
            slug: "design-for-tropics",
            title: "Design for the tropics from the start",
            summary:
              "Here the problem is getting heat and moisture out, not holding them in. That single difference reshapes ventilation, screening, and the control strategy.",
            points: [
              "Humidity management, not heating, is the central design challenge",
              "Vapour pressure deficit as the control target rather than temperature alone",
              "Ventilation capacity and screening sized for tropical solar load",
            ],
          },
          {
            slug: "instrument-from-day-one",
            title: "Instrument from day one",
            summary:
              "You cannot manage a climate you cannot see. Sensing and logging are not an upgrade to add later, they are how the system gets tuned.",
            points: [
              "Climate, root-zone, and light sensing logged continuously",
              "Non-destructive plant measurement to catch stress before it shows",
              "Dashboards that turn readings into a decision, not just a chart",
            ],
          },
          {
            slug: "operating-capability",
            title: "Build the operating capability",
            summary:
              "A greenhouse is a skill, not a purchase. The facilities that succeed are the ones whose people know why the setpoints are what they are.",
            points: [
              "Written protocols for climate, irrigation, hygiene, and scouting",
              "Training and joint operation during the first cycles",
              "Reviews where the data, not the habit, sets the next season's plan",
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------- cultivation
  {
    slug: "cultivation",
    label: "Cultivation",
    eyebrow: "Cultivation",
    title: "The crops, and how we",
    accent: "keep them healthy",
    lede: "What earns its place under cover here, how each crop is grown, and the plant-health discipline that keeps chemistry as the last resort rather than the routine.",
    groups: [
      {
        slug: "fruiting-crops",
        title: "Fruiting crops",
        intro:
          "Fruiting vegetables reward tight climate and nutrition control. They are demanding, and they are where controlled-environment growing shows its value most clearly.",
        linkLabel: "Tomato growing",
        icon: Sprout,
        topics: [
          {
            slug: "tomatoes",
            title: "Tomatoes",
            summary:
              "The benchmark greenhouse crop. Tomato responds visibly to vapour pressure deficit, irrigation strategy, and light, which makes it an excellent teacher for any new facility.",
            points: [
              "High-wire growing with managed truss load and plant balance",
              "Irrigation steered by root-zone moisture and drain percentage",
              "Climate tuned to keep transpiration steady through the tropical midday",
              "Fruit quality tracked non-destructively for firmness and sugar content",
            ],
          },
        ],
      },
      {
        slug: "salad-herbs-berries",
        title: "Salad, herbs, and berries",
        intro:
          "Short-cycle crops grown in greenhouses and plant factories, where light recipe, root-zone control, and hygiene do most of the work.",
        linkLabel: "Short-cycle crops",
        icon: Leaf,
        topics: [
          {
            slug: "indoor-lettuce",
            title: "Indoor lettuce",
            summary:
              "Fast, predictable, and highly responsive to light and root-zone temperature. Lettuce is the workhorse crop for plant factories and the fastest route to a repeatable protocol.",
            points: [
              "Deep flow and nutrient film systems with controlled solution temperature",
              "Light recipes tuned for weight, colour, and leaf shape",
              "Cycle protocols that hold quality year-round regardless of weather",
            ],
          },
          {
            slug: "indoor-herbs",
            title: "Indoor herbs",
            summary:
              "High value per square metre and strong demand from food service. Herbs are sensitive to light spectrum and airflow, which makes them a good test of a facility's precision.",
            points: [
              "Spectrum tuning for aroma compounds and leaf density",
              "Airflow management to keep canopies dry and compact",
              "Staggered planting for continuous weekly supply",
            ],
          },
          {
            slug: "indoor-spinach",
            title: "Indoor spinach",
            summary:
              "Difficult in the open tropics because of heat and disease pressure, and therefore an obvious candidate for controlled environments.",
            points: [
              "Root-zone cooling to keep the crop out of heat stress",
              "Tight humidity control to suppress foliar disease",
              "Clean hydroponic culture that avoids soil-borne pathogens",
            ],
          },
          {
            slug: "indoor-strawberries",
            title: "Indoor strawberries",
            summary:
              "A premium crop that normally demands highland conditions. Under cover, the climate can be brought to the crop rather than the crop to the mountain.",
            points: [
              "Table-top growing at working height on controlled substrate",
              "Day and night temperature strategy to drive flowering and fruit set",
              "Managed pollination inside an enclosed structure",
            ],
          },
        ],
      },
      {
        slug: "plant-health",
        title: "Plant health",
        intro:
          "A sealed structure is the first line of defence. Everything after that is discipline: watch closely, act early, and keep the house clean.",
        linkLabel: "Protection strategy",
        icon: ShieldCheck,
        topics: [
          {
            slug: "integrated-pest-management",
            title: "Integrated pest management",
            summary:
              "Exclusion first, biological control second, chemistry only as a last resort. In an enclosed system, prevention is far cheaper than any cure.",
            points: [
              "Physical exclusion through netting, entry protocols, and screening",
              "Biological control agents released before pressure builds",
              "Targeted intervention thresholds instead of calendar spraying",
            ],
          },
          {
            slug: "scouting-and-monitoring",
            title: "Scouting and monitoring",
            summary:
              "Problems are cheap to fix while they are still small and local. Structured scouting, supported by imaging, finds them at that stage.",
            points: [
              "Fixed scouting routes with recorded counts, not impressions",
              "Sticky traps mapped to locate pressure by zone",
              "Imaging and hyperspectral sensing to flag stress before symptoms are visible",
            ],
          },
          {
            slug: "hygiene-protocol",
            title: "Hygiene protocol",
            summary:
              "Most outbreaks walk in on shoes, hands, and tools. A hygiene protocol is the least glamorous and highest-return part of crop protection.",
            points: [
              "Controlled entry with footbaths, clothing, and hand hygiene",
              "Tool disinfection between rows and between blocks",
              "Full clean-down and disinfection between crop cycles",
            ],
          },
          {
            slug: "pollination",
            title: "Pollination",
            summary:
              "Enclose a crop and you also exclude its pollinators. Fruit set then becomes something the grower has to plan for deliberately.",
            points: [
              "Managed bumblebee or stingless bee colonies inside the structure",
              "Mechanical and airflow-assisted pollination where colonies are impractical",
              "Climate held within the window where pollen stays viable",
            ],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------- technology
  {
    slug: "technology",
    label: "Technology",
    eyebrow: "Technology",
    title: "The systems behind a",
    accent: "controlled environment",
    lede: "Structure, climate, water, and control. Each one is a discipline in its own right, and they only work when designed as a single system.",
    groups: [
      {
        slug: "structure-and-envelope",
        title: "Structure and envelope",
        intro:
          "The building is a climate instrument. Its height, venting, and covering decide how much work the machinery has to do afterwards.",
        linkLabel: "Building design",
        icon: Building2,
        topics: [
          {
            slug: "foundation",
            title: "Foundation",
            summary:
              "Tropical sites bring soft soils, heavy rain, and converted paddy land. The foundation has to handle settlement and water long before it handles wind.",
            points: [
              "Soil bearing assessment and settlement risk on converted land",
              "Raised floor levels and drainage away from the growing area",
              "Anchoring designed for uplift during storms",
            ],
          },
          {
            slug: "steel-structure",
            title: "Steel structure",
            summary:
              "Gutter height is the most consequential number in the design. Taller houses hold a larger, more stable air buffer, which is exactly what a hot climate needs.",
            points: [
              "Generous gutter height for thermal buffering and light distribution",
              "Spans and loading matched to wind and equipment suspended from the frame",
              "Corrosion protection specified for humid, coastal conditions",
            ],
          },
          {
            slug: "aluminium-system",
            title: "Aluminium system",
            summary:
              "The glazing system is where a greenhouse leaks air, water, and money. Profiles and gaskets determine whether the structure holds the climate you paid to create.",
            points: [
              "Profiles carrying film, polycarbonate, or glass to suit budget and light needs",
              "Sealing and condensation drainage detailed for high humidity",
              "Serviceable components that can be replaced without dismantling bays",
            ],
          },
          {
            slug: "ventilation",
            title: "Ventilation",
            summary:
              "In the tropics, ventilation is the primary cooling system. Everything else is a supplement to it.",
            points: [
              "Roof and side vents sized for peak solar load, not average conditions",
              "Layouts that use prevailing wind and stack effect together",
              "Automated vent control responding to temperature, humidity, and rain",
            ],
          },
          {
            slug: "insect-netting",
            title: "Insect netting",
            summary:
              "Netting is the cheapest crop protection available, and it always costs airflow. The design job is finding the balance that protects without cooking the crop.",
            points: [
              "Mesh selected against the target pests, from thrips upward",
              "Vent area enlarged to compensate for the resistance the net adds",
              "Inspection and repair routines, because one tear undoes the barrier",
            ],
          },
          {
            slug: "service-building",
            title: "Service building",
            summary:
              "Grading, packing, storage, and hygiene control belong outside the growing area. Keeping them separate protects both the crop and the product.",
            points: [
              "Post-harvest handling and cold storage adjacent to the growing area",
              "Irrigation room housing tanks, dosing, and filtration",
              "Entry, changing, and hygiene control at a single point",
            ],
          },
          {
            slug: "rainwater-collection",
            title: "Rainwater collection",
            summary:
              "A greenhouse roof is a large, clean catchment. In a high-rainfall country, that is the best irrigation water available and it arrives free.",
            points: [
              "Gutter and storage capacity sized to bridge the dry period",
              "First-flush diversion and filtration before storage",
              "Blending strategy with groundwater when reserves run low",
            ],
          },
        ],
      },
      {
        slug: "heat-humidity-air",
        title: "Heat, humidity, and air",
        intro:
          "The goal is not a cool greenhouse, it is a crop that transpires steadily all day. That means managing heat, humidity, and carbon dioxide together.",
        linkLabel: "Climate strategy",
        icon: Thermometer,
        topics: [
          {
            slug: "cooling",
            title: "Cooling",
            summary:
              "Solar load is the dominant challenge. The cheapest cooling is the heat you never let in, so screening and ventilation come before machinery.",
            points: [
              "Shade and diffuse screens to cut peak radiation load",
              "Evaporative cooling where incoming air is dry enough to benefit",
              "Mechanical cooling reserved for the hours that genuinely need it",
            ],
          },
          {
            slug: "humidity-control",
            title: "Humidity control",
            summary:
              "High humidity stalls transpiration, and a crop that cannot transpire cannot take up calcium or shed heat. This is the defining tropical greenhouse problem.",
            points: [
              "Vapour pressure deficit as the actual control target",
              "Air movement to break the boundary layer around leaves",
              "Dehumidification and controlled air exchange where ventilation is not enough",
            ],
          },
          {
            slug: "horticoolers",
            title: "Horticoolers and air treatment",
            summary:
              "Air handling units condition and distribute air where passive strategies run out, particularly in semi-closed houses and plant factories.",
            points: [
              "Conditioned air delivered evenly to the canopy rather than the roof space",
              "Combined cooling and dehumidification in a single treatment step",
              "Enclosed operation that keeps insects and pathogens out while managing climate",
            ],
          },
          {
            slug: "co2-enrichment",
            title: "CO2 enrichment",
            summary:
              "In a well-sealed house, carbon dioxide becomes the limiting factor for photosynthesis long before light does. Enrichment only makes sense once the house holds it.",
            points: [
              "Measurement first, to establish whether depletion is actually occurring",
              "Dosing balanced against the ventilation the climate demands",
              "Most viable in semi-closed structures and plant factories",
            ],
          },
        ],
      },
      {
        slug: "water-and-nutrition",
        title: "Water and nutrition",
        intro:
          "Water quality in, nutrition dialled in, drain water recovered. A closed water strategy is both the sustainable option and the economical one.",
        linkLabel: "Water strategy",
        icon: Droplets,
        topics: [
          {
            slug: "pre-treatment",
            title: "Pre-treatment",
            summary:
              "Source water decides the whole design. Iron, hardness, salinity, and pathogens all have to be dealt with before a nutrient recipe means anything.",
            points: [
              "Full source water analysis as the starting point",
              "Filtration, iron removal, and softening as required",
              "Disinfection to keep pathogens out of the irrigation loop",
            ],
          },
          {
            slug: "fertilization",
            title: "Fertilization",
            summary:
              "A nutrient recipe is written for a specific crop, stage, and climate. It changes as the plant and the weather change.",
            points: [
              "Recipes formulated from the source water analysis, not a generic table",
              "Adjustment by crop stage and by season",
              "Verification through solution and drain analysis",
            ],
          },
          {
            slug: "dosing",
            title: "Dosing",
            summary:
              "The dosing unit is where the recipe becomes reality. Accuracy and reliability here show up directly in crop uniformity.",
            points: [
              "Automated dosing controlled to target electrical conductivity and pH",
              "Multi-channel injection so elements can be steered independently",
              "Alarms and fail-safes, because a dosing fault is a fast crop loss",
            ],
          },
          {
            slug: "post-treatment",
            title: "Post-treatment",
            summary:
              "Water that has passed the root zone carries nutrients and, potentially, pathogens. Treating it is what makes recirculation safe.",
            points: [
              "Filtration to remove organic matter and particles",
              "Disinfection by ultraviolet, heat, or slow sand filtration",
              "Verification before the water rejoins the supply",
            ],
          },
          {
            slug: "drainwater-recycling",
            title: "Drainwater recycling",
            summary:
              "Recirculation is where controlled-environment growing earns its water reputation. It also stops fertiliser leaving the site as pollution.",
            points: [
              "Drain collected, measured, and analysed rather than discarded",
              "Nutrients recovered and rebalanced back into the supply",
              "Sharply reduced water and fertiliser use per unit of production",
            ],
          },
          {
            slug: "hydroponics",
            title: "Hydroponics and substrates",
            summary:
              "Growing without soil gives direct control of the root zone, and removes an entire category of soil-borne disease from the equation.",
            points: [
              "Substrate culture on cocopeat or rockwool for fruiting crops",
              "Deep flow and nutrient film systems for leafy crops",
              "Root-zone moisture, temperature, and oxygen managed as control variables",
            ],
          },
        ],
      },
      {
        slug: "control-and-closed-systems",
        title: "Control and closed systems",
        intro:
          "The layer that ties the rest together: control software, energy and water strategy, and fully closed production.",
        linkLabel: "Control systems",
        icon: Cpu,
        topics: [
          {
            slug: "automation",
            title: "Automation and control",
            summary:
              "Sensors, controllers, and dashboards that run the house to a strategy instead of to a series of manual reactions.",
            points: [
              "Climate, irrigation, and lighting under coordinated control",
              "Continuous logging so every decision can be reviewed against outcomes",
              "Remote monitoring and alarms for out-of-range conditions",
              "Open, affordable hardware wherever it can do the job",
            ],
          },
          {
            slug: "sustainability",
            title: "Sustainability",
            summary:
              "Resource efficiency is not a separate feature. In a closed system it is simply what good engineering looks like.",
            points: [
              "Water recirculated rather than discharged",
              "Fertiliser kept in the loop and out of waterways",
              "Energy demand reduced by design before it is met by supply",
              "Solar generation matched to the facility's daytime load",
            ],
          },
          {
            slug: "plant-factories",
            title: "Plant factories",
            summary:
              "Fully closed, artificially lit, stacked production. Climate becomes completely independent of the weather outside, at the cost of an energy bill.",
            points: [
              "Multi-layer growing with tuned light recipes per crop",
              "Complete independence from season, weather, and land quality",
              "Highest yield per square metre and the highest energy intensity",
              "Best suited to short-cycle, high-value crops close to the consumer",
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------- greenhouses
  {
    slug: "greenhouses",
    label: "Greenhouses",
    eyebrow: "Greenhouses",
    title: "Structures for",
    accent: "tropical horticulture",
    lede: "From a low-cost screenhouse to a fully closed plant factory. Each step buys more control, and asks for more capital and more skill in return.",
    groups: [
      {
        slug: "permanent-structures",
        title: "Permanent steel structures",
        intro:
          "The durable standard: a galvanised steel frame carrying film, polycarbonate, or glass. Built for decades of service and for the equipment a controlled climate needs.",
        linkLabel: "Built to last",
        icon: Building2,
        lede: "A steel greenhouse is the long-term option. It costs more at the start and gives back a structure that holds its shape, carries screens and irrigation, and can be upgraded rather than replaced.",
        topics: [
          {
            slug: "frame-and-lifespan",
            title: "Frame and service life",
            summary:
              "Hot-dip galvanised steel is specified for humid, sometimes coastal conditions where corrosion, not load, is what ends a structure's life.",
            points: [
              "Decades of service with low structural maintenance",
              "Corrosion protection specified for humidity and salt air",
              "Components replaceable without dismantling whole bays",
            ],
          },
          {
            slug: "gutter-height",
            title: "Gutter height and climate",
            summary:
              "Height is the cheapest climate control there is. A taller house holds a larger air buffer, which softens the midday peak before any machinery runs.",
            points: [
              "Large air volume that buffers temperature swings",
              "Better light distribution across the canopy",
              "Room for screens, gutters, and high-wire crops",
            ],
          },
          {
            slug: "covering-choice",
            title: "Covering choice",
            summary:
              "Film, polycarbonate, and glass differ in light transmission, lifespan, and cost. The right pick depends on the crop and how long the facility must last.",
            points: [
              "Film: lowest cost, periodic replacement",
              "Polycarbonate: durable, good diffusion, mid cost",
              "Glass: highest transmission and longest life, highest cost",
            ],
          },
          {
            slug: "upgrade-path",
            title: "Room to upgrade",
            summary:
              "A steel frame is worth specifying when you expect the operation to grow into more control than it starts with.",
            points: [
              "Screens, cooling, and CO2 added later without rebuilding",
              "Loads for irrigation, lighting, and sensing designed in from the start",
              "Staged investment as the operation proves itself",
            ],
          },
        ],
      },
      {
        slug: "local-material-structures",
        title: "Local-material structures",
        intro:
          "Locally sourced structures cut capital cost dramatically and put protected cultivation within reach of smallholders and farmer groups.",
        linkLabel: "Affordable builds",
        icon: Sprout,
        lede: "Not every grower needs, or can finance, a steel greenhouse. A well-built bamboo or timber structure delivers the two protections that matter most, rain exclusion and insect exclusion, at a fraction of the cost.",
        topics: [
          {
            slug: "local-materials",
            title: "Local materials, local repair",
            summary:
              "A structure built from materials available nearby can be maintained by the people who use it, without waiting on a supplier.",
            points: [
              "Bamboo and timber sourced and worked locally",
              "Repairs affordable and quick after storm damage",
              "Construction skills that stay in the community",
            ],
          },
          {
            slug: "highest-return-protections",
            title: "The two highest-return protections",
            summary:
              "Most of the yield and quality gain from growing under cover comes from keeping rain off the crop and insects out of it. Both are achievable cheaply.",
            points: [
              "Rain exclusion, which cuts foliar disease sharply",
              "Insect netting, which reduces pest pressure and spraying",
              "Shade management during the hottest part of the day",
            ],
          },
          {
            slug: "honest-limits",
            title: "Honest limits",
            summary:
              "A low-cost structure is a first step, not a small greenhouse. It is important to be clear about what it will not do.",
            points: [
              "Shorter service life than steel, with periodic rebuilding",
              "Limited climate control beyond ventilation and shading",
              "Lower gutter height, so less thermal buffering",
            ],
          },
          {
            slug: "first-step",
            title: "A realistic first step",
            summary:
              "For many farmer groups the right sequence is to learn protected cultivation cheaply, prove the market, and reinvest into a more capable structure.",
            points: [
              "Lower capital risk while the operation learns",
              "Protocols and habits that transfer to a larger facility later",
              "Evidence for financing the next stage",
            ],
          },
        ],
      },
      {
        slug: "fully-managed-environments",
        title: "Fully managed environments",
        intro:
          "The full discipline: structure, climate, irrigation, and control designed together, so the growing environment becomes a set of decisions rather than a forecast.",
        linkLabel: "The full discipline",
        icon: Settings2,
        lede: "Controlled-environment agriculture is not a building type, it is a way of working. The structure, the climate system, the irrigation, and the data all serve one goal: putting the grower in charge of the environment instead of reacting to it.",
        topics: [
          {
            slug: "designed-as-one-system",
            title: "Designed as one system",
            summary:
              "Structure, climate, and irrigation constrain each other. Designing them separately is how facilities end up fighting themselves.",
            points: [
              "Ventilation capacity matched to the covering and the solar load",
              "Irrigation strategy matched to the climate the house can actually hold",
              "Control system specified alongside the hardware, not after it",
            ],
          },
          {
            slug: "steer-to-a-target",
            title: "Steer to a crop target",
            summary:
              "The setpoint is not a comfortable number, it is the condition the crop needs in order to transpire and grow steadily through the day.",
            points: [
              "Vapour pressure deficit held in the crop's working range",
              "Root zone and canopy managed together, not in isolation",
              "Strategy adjusted by crop stage rather than left fixed",
            ],
          },
          {
            slug: "data-at-the-centre",
            title: "Data at the centre",
            summary:
              "Continuous measurement is what turns a growing season into something you can review, explain, and improve.",
            points: [
              "Climate, root-zone, and light logged continuously",
              "Non-destructive plant measurement to catch stress early",
              "Season reviews where the data sets the next plan",
            ],
          },
          {
            slug: "predictable-output",
            title: "Predictable output",
            summary:
              "The commercial value of control is not only higher yield, it is being able to promise a buyer a volume and a grade on a date.",
            points: [
              "Year-round production independent of the season",
              "Consistent grade and quality that holds contracts",
              "Planning that a cold chain and a buyer can rely on",
            ],
          },
        ],
      },
      {
        slug: "closed-plant-factories",
        title: "Closed plant factories",
        intro:
          "Closed, stacked, artificially lit production with no dependence on sunlight or land. The most controlled option available, and the most energy intensive.",
        linkLabel: "Stacked production",
        icon: Layers,
        lede: "A plant factory removes the weather from the equation entirely. Every input is chosen: light spectrum and duration, temperature, humidity, carbon dioxide, and nutrition. What you gain in control, you pay for in energy.",
        topics: [
          {
            slug: "stacked-production",
            title: "Stacked production",
            summary:
              "Growing in layers multiplies the output of a footprint, which is what makes production viable on expensive land close to the consumer.",
            points: [
              "Multiple growing layers within one building",
              "Highest yield per square metre of any system",
              "No dependence on land quality or drainage",
            ],
          },
          {
            slug: "light-recipes",
            title: "Light recipes",
            summary:
              "With artificial light, the spectrum and photoperiod become adjustable inputs that shape yield, colour, texture, and flavour.",
            points: [
              "Spectrum tuned per crop and per growth stage",
              "Photoperiod set to drive development on a schedule",
              "Uniform light across every layer",
            ],
          },
          {
            slug: "energy-strategy",
            title: "Energy strategy",
            summary:
              "Energy is the deciding economic factor. A plant factory only works when the crop value and the energy plan are considered together from day one.",
            points: [
              "Lighting and cooling as the dominant loads",
              "Heat from lighting recovered rather than simply rejected",
              "Solar generation matched to the daytime load",
            ],
          },
          {
            slug: "best-fit-crops",
            title: "Where it fits best",
            summary:
              "Plant factories reward short-cycle, high-value, compact crops. They are also an excellent research instrument.",
            points: [
              "Leafy greens, herbs, and microgreens",
              "Seedling and transplant production at consistent quality",
              "Research where every variable has to be held steady",
            ],
          },
        ],
      },
    ],
  },
];

export function findIFSection(slug: string): IFSection | undefined {
  return IF_SECTIONS.find((s) => s.slug === slug);
}

// Landing-page pillars, one per section. Kept here so the landing page and the
// sub-navigation always agree with the section data above.
export const IF_PILLARS: {
  slug: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
}[] = [
  {
    slug: "approach",
    label: "Approach",
    blurb:
      "Which crop, which site, and how much control the crop and the business case actually justify.",
    icon: Target,
  },
  {
    slug: "cultivation",
    label: "Cultivation",
    blurb:
      "Crops under cover, from tomato to salad, herbs, and berries, plus the plant-health discipline that keeps them clean.",
    icon: Leaf,
  },
  {
    slug: "technology",
    label: "Technology",
    blurb:
      "The building, the air, the water, and the control layer, designed as one system for tropical conditions.",
    icon: Cpu,
  },
  {
    slug: "greenhouses",
    label: "Greenhouses",
    blurb:
      "From affordable local-material builds to permanent steel structures and fully closed plant factories.",
    icon: Warehouse,
  },
];

// Why tropical controlled-environment agriculture is its own engineering
// problem. Used on the landing page.
export const IF_TROPICAL_POINTS: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Humidity, not cold, is the constraint",
    body: "The task here is getting heat and moisture out rather than holding them in, so vapour pressure deficit, not temperature alone, becomes the control target.",
    icon: Wind,
  },
  {
    title: "Light is abundant, heat comes with it",
    body: "Sunlight is rarely the limit near the equator. Managing the heat that arrives alongside it is what separates a working structure from an oven.",
    icon: Sun,
  },
  {
    title: "Pest pressure never pauses",
    body: "Without a cold season to break life cycles, exclusion and hygiene have to carry the load year-round rather than seasonally.",
    icon: Bug,
  },
  {
    title: "Rain is a resource, not a nuisance",
    body: "High rainfall makes roof catchment the cleanest and cheapest irrigation source available, provided storage and first-flush handling are designed in.",
    icon: CloudRain,
  },
];

// Capability strip shown on the landing page. These map to the center's
// existing research and technology programmes.
export const IF_CAPABILITIES: { label: string; icon: LucideIcon }[] = [
  { label: "Climate control systems", icon: Thermometer },
  { label: "Hyperspectral plant sensing", icon: Microscope },
  { label: "IoT sensor networks", icon: Gauge },
  { label: "Hydroponics and fertigation", icon: FlaskConical },
  { label: "Plant factory systems", icon: Layers },
  { label: "Automation and dashboards", icon: Settings2 },
  { label: "Water recirculation", icon: Recycle },
  { label: "Pollination and IPM", icon: Flower2 },
];

// How a collaboration typically runs. Landing page, partnership framing.
export const IF_PROCESS: { step: string; title: string; body: string }[] = [
  {
    step: "01",
    title: "Scope and site",
    body: "We look at the crop, the market, the site, and the water and power available, then say plainly whether a controlled environment is the right answer.",
  },
  {
    step: "02",
    title: "Design and trial",
    body: "A design brief and, where it matters, an instrumented trial block so the numbers behind the plan come from your site rather than a catalogue.",
  },
  {
    step: "03",
    title: "Build and instrument",
    body: "Structure, climate, and irrigation implemented together, with sensing and control installed from the start rather than retrofitted.",
  },
  {
    step: "04",
    title: "Operate and improve",
    body: "Protocols, training, and joint operation through the first cycles, then regular reviews where the logged data sets the next season's targets.",
  },
];

// Tags used to surface relevant Field Notes on the Knowledge page.
export const IF_NOTE_TAGS = [
  "Greenhouse & Indoor Farming",
  "Indoor Farming",
  "Greenhouse",
  "Plant Factory",
  "Hydroponics",
  "Controlled Environment",
];

// ---- Bahasa Indonesia (see lib/i18n.tsx) ----
// Indonesian overlay keyed by section, group, and topic slug. Slugs, icons, and
// the English exports above stay untouched; pages read the localized copy
// through the `xxxFor(lang)` helpers below.

type IFTopicCopy = Pick<IFTopic, "title" | "summary" | "points">;
type IFGroupCopy = Pick<IFGroup, "title" | "intro" | "linkLabel"> & {
  lede?: string;
  topics: Record<string, IFTopicCopy>;
};
type IFSectionCopy = Pick<IFSection, "label" | "eyebrow" | "title" | "accent" | "lede"> & {
  groups: Record<string, IFGroupCopy>;
};

const IF_SECTIONS_ID: Record<string, IFSectionCopy> = {
  approach: {
    label: "Pendekatan",
    eyebrow: "Pendekatan",
    title: "Keputusan yang diambil",
    accent: "sebelum membangun",
    lede: "Kelayakan dihitung, bukan diasumsikan. Tiga hal menentukan apakah lingkungan terkendali akan balik modal di sini: tanamannya, lokasinya, dan seberapa banyak kendali yang benar-benar Anda butuhkan.",
    groups: {
      "crop-and-market": {
        title: "Kecocokan tanaman dan pasar",
        intro:
          "Pilihan tanaman menentukan semua hal sesudahnya: struktur, strategi iklim, desain irigasi, dan apakah hitungannya masuk sama sekali.",
        linkLabel: "Kelayakan tanaman",
        topics: {
          "match-the-market": {
            title: "Sesuaikan tanaman dengan pasar",
            summary:
              "Lingkungan terkendali baru balik modal jika tanamannya laku dengan harga premium. Pertanyaannya bukan apa yang paling mudah tumbuh, tetapi apa yang paling laku di sekitar Anda.",
            points: [
              "Sayuran daun dan herba untuk usaha kuliner perkotaan, hotel, dan ritel modern",
              "Tomat dan stroberi, saat mutu yang konsisten dan pasokan sepanjang tahun dihargai lebih tinggi",
              "Produksi di luar musim, saat pasokan dari lahan terbuka turun dan harga naik",
            ],
          },
          "match-the-climate": {
            title: "Sesuaikan tanaman dengan iklim",
            summary:
              "Indonesia tidak punya satu iklim. Tanaman yang subur di dataran tinggi mungkin butuh pendinginan aktif dan penurunan kelembapan di dataran rendah, dan itu mengubah seluruh rencana modal.",
            points: [
              "Dataran tinggi: malam yang sejuk sudah banyak membantu, sehingga ventilasi pasif lebih efektif",
              "Dataran rendah: panas dan kelembapan adalah kendala utamanya, bukan dingin",
              "Tanaman yang menyukai suhu sejuk (selada, stroberi) menanggung biaya iklim tertinggi di dataran rendah",
            ],
          },
          "cycle-time": {
            title: "Lama siklus dan arus kas",
            summary:
              "Tanaman siklus pendek mengembalikan uang, dan yang tak kalah penting, pengetahuan, lebih cepat. Tanaman siklus panjang menguntungkan operator yang protokolnya sudah terkendali.",
            points: [
              "Sayuran daun berganti dalam hitungan minggu, jadi satu kesalahan hanya merugikan satu siklus, bukan satu musim",
              "Tanaman buah berjalan berbulan-bulan dan menuntut kendali iklim dan nutrisi yang lebih stabil",
              "Banyak usaha mulai dari siklus pendek, lalu naik kelas ke tanaman buah",
            ],
          },
          "trial-first": {
            title: "Buktikan dulu lewat uji coba",
            summary:
              "Kami lebih memilih menjalankan satu musim berinstrumen dalam skala kecil daripada merancang fasilitas besar berdasarkan asumsi. Uji coba mengubah opini menjadi angka.",
            points: [
              "Blok uji coba kecil dengan sensor lengkap sebelum menanamkan modal",
              "Hasil panen, mutu, air, dan energi terukur per satuan produksi",
              "Brief desain yang ditulis dari data Anda, bukan dari brosur",
            ],
          },
        },
      },
      "site-and-climate": {
        title: "Lokasi dan iklim",
        intro:
          "Pemilihan lokasi diam-diam menentukan biaya operasional Anda untuk sepuluh tahun ke depan. Ketinggian, air, listrik, dan jarak ke pasar lebih penting daripada bentuk atap.",
        linkLabel: "Penilaian lokasi",
        topics: {
          altitude: {
            title: "Ketinggian menentukan strategi iklim",
            summary:
              "Elevasi adalah pendinginan gratis paling berguna di daerah tropis. Ketinggian menentukan apakah iklim yang baik cukup dicapai dengan ventilasi atau harus dibayar dengan mengondisikan udara.",
            points: [
              "Dataran tinggi: ventilasi alami dan naungan sering kali cukup hampir sepanjang tahun",
              "Ketinggian menengah: strategi hibrida, dengan pendinginan khusus untuk jam puncak",
              "Dataran rendah: siapkan pendinginan aktif dan penurunan kelembapan dalam anggaran energi",
            ],
          },
          "market-distance": {
            title: "Kedekatan dengan pasar",
            summary:
              "Nilai produk segar turun dari jam ke jam. Dekat dengan pembeli adalah strategi mutu, sama pentingnya dengan strategi logistik.",
            points: [
              "Rantai dingin yang lebih pendek menjaga umur simpan dan mengurangi penolakan saat pengiriman",
              "Lokasi pinggiran kota menimbang harga lahan terhadap kesegaran dan ongkos angkut",
              "Plant factory bisa berada paling dekat dengan konsumen karena tidak bergantung pada kualitas lahan",
            ],
          },
          "water-and-power": {
            title: "Air dan listrik",
            summary:
              "Kualitas air membentuk seluruh desain irigasi, dan keandalan listrik menentukan seberapa jauh Anda bisa bergantung pada otomasi dengan aman.",
            points: [
              "Air baku diuji lebih dulu: salinitas, kesadahan, zat besi, dan patogen",
              "Pemanenan air hujan sebagai input paling bersih dan paling murah bila curah hujan memungkinkan",
              "Keandalan jaringan listrik, daya cadangan, dan potensi surya dinilai sebelum menentukan ukuran sistem kendali",
            ],
          },
          "site-and-orientation": {
            title: "Lahan, drainase, dan orientasi",
            summary:
              "Lahan itu sendiri menetapkan batasan yang tidak bisa diubah oleh pengendali mana pun: ke mana air mengalir keluar, dari mana angin datang, dan apa yang menaungi Anda di sore hari.",
            points: [
              "Drainase dan riwayat banjir, terutama di bekas lahan sawah",
              "Arah angin dominan, yang menentukan kinerja ventilasi alami",
              "Orientasi dan halangan di sekitar yang memengaruhi cahaya sepanjang hari",
            ],
          },
        },
      },
      "level-of-control": {
        title: "Tingkat kendali",
        intro:
          "Ada spektrum antara lahan terbuka dan plant factory yang sepenuhnya tertutup. Titik yang tepat adalah yang benar-benar sanggup dijalankan oleh tanaman, iklim, dan tim Anda.",
        linkLabel: "Desain sistem",
        topics: {
          "level-of-control": {
            title: "Sesuaikan tingkat kendali dengan tujuan",
            summary:
              "Kendali yang lebih besar berarti modal lebih besar dan keterampilan operasional lebih tinggi. Sistem terbaik adalah yang paling sederhana namun andal menghadirkan iklim yang dibutuhkan tanaman Anda.",
            points: [
              "Screenhouse: perlindungan dari hujan dan serangga dengan biaya terendah",
              "Greenhouse berventilasi alami: pengaruh nyata pada iklim dengan pemakaian energi sedang",
              "Greenhouse semi-tertutup dan plant factory: kendali penuh, modal dan energi tertinggi",
            ],
          },
          "design-for-tropics": {
            title: "Dirancang untuk tropis sejak awal",
            summary:
              "Di sini masalahnya adalah mengeluarkan panas dan uap air, bukan menahannya. Satu perbedaan itu mengubah ventilasi, kasa, dan strategi kendali.",
            points: [
              "Pengelolaan kelembapan, bukan pemanasan, adalah tantangan desain utama",
              "Defisit tekanan uap (VPD) sebagai target kendali, bukan suhu saja",
              "Kapasitas ventilasi dan kasa dirancang untuk beban radiasi matahari tropis",
            ],
          },
          "instrument-from-day-one": {
            title: "Pasang instrumen sejak hari pertama",
            summary:
              "Anda tidak bisa mengelola iklim yang tidak bisa Anda lihat. Sensor dan pencatatan data bukan tambahan untuk nanti, melainkan cara sistem disetel.",
            points: [
              "Iklim, zona akar, dan cahaya dicatat terus-menerus",
              "Pengukuran tanaman tanpa merusak untuk mendeteksi stres sebelum terlihat",
              "Dashboard yang mengubah bacaan menjadi keputusan, bukan sekadar grafik",
            ],
          },
          "operating-capability": {
            title: "Bangun kemampuan operasional",
            summary:
              "Greenhouse adalah keterampilan, bukan barang yang dibeli. Fasilitas yang berhasil adalah yang timnya paham mengapa setpoint-nya ditetapkan seperti itu.",
            points: [
              "Protokol tertulis untuk iklim, irigasi, kebersihan, dan pengamatan hama",
              "Pelatihan dan operasi bersama selama siklus-siklus pertama",
              "Evaluasi di mana data, bukan kebiasaan, yang menentukan rencana musim berikutnya",
            ],
          },
        },
      },
    },
  },

  cultivation: {
    label: "Budidaya",
    eyebrow: "Budidaya",
    title: "Tanamannya, dan cara kami",
    accent: "menjaganya tetap sehat",
    lede: "Apa yang layak ditanam di bawah naungan di sini, bagaimana tiap tanaman dibudidayakan, dan disiplin kesehatan tanaman yang menjadikan bahan kimia sebagai pilihan terakhir, bukan rutinitas.",
    groups: {
      "fruiting-crops": {
        title: "Tanaman buah",
        intro:
          "Sayuran buah membalas kendali iklim dan nutrisi yang ketat. Tanaman ini menuntut, dan justru di sinilah nilai budidaya lingkungan terkendali paling terlihat.",
        linkLabel: "Budidaya tomat",
        topics: {
          tomatoes: {
            title: "Tomat",
            summary:
              "Tanaman acuan greenhouse. Tomat merespons jelas terhadap defisit tekanan uap, strategi irigasi, dan cahaya, sehingga menjadi guru yang sangat baik bagi fasilitas baru.",
            points: [
              "Budidaya high-wire dengan beban tandan dan keseimbangan tanaman yang dikelola",
              "Irigasi yang diatur berdasarkan kelembapan zona akar dan persentase drain",
              "Iklim disetel agar transpirasi tetap stabil melewati siang hari tropis",
              "Mutu buah dipantau tanpa merusak untuk kekerasan dan kadar gula",
            ],
          },
        },
      },
      "salad-herbs-berries": {
        title: "Selada, herba, dan beri",
        intro:
          "Tanaman siklus pendek yang ditanam di greenhouse dan plant factory, tempat resep cahaya, kendali zona akar, dan kebersihan melakukan sebagian besar pekerjaan.",
        linkLabel: "Tanaman siklus pendek",
        topics: {
          "indoor-lettuce": {
            title: "Selada indoor",
            summary:
              "Cepat, dapat diprediksi, dan sangat responsif terhadap cahaya dan suhu zona akar. Selada adalah tanaman andalan plant factory dan jalan tercepat menuju protokol yang bisa diulang.",
            points: [
              "Sistem deep flow dan NFT dengan suhu larutan terkendali",
              "Resep cahaya yang disetel untuk bobot, warna, dan bentuk daun",
              "Protokol siklus yang menjaga mutu sepanjang tahun apa pun cuacanya",
            ],
          },
          "indoor-herbs": {
            title: "Herba indoor",
            summary:
              "Nilai per meter persegi tinggi dan permintaan kuat dari usaha kuliner. Herba peka terhadap spektrum cahaya dan aliran udara, sehingga menjadi ujian yang baik untuk presisi sebuah fasilitas.",
            points: [
              "Penyetelan spektrum untuk senyawa aroma dan kerapatan daun",
              "Pengelolaan aliran udara agar kanopi tetap kering dan kompak",
              "Penanaman bertahap untuk pasokan mingguan yang berkelanjutan",
            ],
          },
          "indoor-spinach": {
            title: "Bayam indoor",
            summary:
              "Sulit dibudidayakan di lahan terbuka tropis karena panas dan tekanan penyakit, sehingga jelas menjadi kandidat untuk lingkungan terkendali.",
            points: [
              "Pendinginan zona akar agar tanaman terhindar dari stres panas",
              "Kendali kelembapan yang ketat untuk menekan penyakit daun",
              "Budidaya hidroponik yang bersih untuk menghindari patogen tular tanah",
            ],
          },
          "indoor-strawberries": {
            title: "Stroberi indoor",
            summary:
              "Tanaman premium yang biasanya menuntut kondisi dataran tinggi. Di bawah naungan, iklimnya yang dibawa ke tanaman, bukan tanamannya yang dibawa ke gunung.",
            points: [
              "Budidaya table-top setinggi kerja di atas substrat terkendali",
              "Strategi suhu siang dan malam untuk memicu pembungaan dan pembentukan buah",
              "Penyerbukan terkelola di dalam struktur tertutup",
            ],
          },
        },
      },
      "plant-health": {
        title: "Kesehatan tanaman",
        intro:
          "Struktur yang rapat adalah garis pertahanan pertama. Setelah itu semuanya soal disiplin: amati dengan cermat, bertindak lebih awal, dan jaga rumah tanam tetap bersih.",
        linkLabel: "Strategi perlindungan",
        topics: {
          "integrated-pest-management": {
            title: "Pengendalian hama terpadu",
            summary:
              "Cegah masuk lebih dulu, pengendalian hayati kedua, bahan kimia hanya sebagai pilihan terakhir. Dalam sistem tertutup, mencegah jauh lebih murah daripada mengobati.",
            points: [
              "Pencegahan fisik lewat jaring, protokol masuk, dan kasa",
              "Agen pengendali hayati dilepas sebelum tekanan hama meningkat",
              "Ambang intervensi yang terarah, bukan penyemprotan terjadwal",
            ],
          },
          "scouting-and-monitoring": {
            title: "Pengamatan dan pemantauan",
            summary:
              "Masalah murah diatasi selagi masih kecil dan setempat. Pengamatan terstruktur, didukung pencitraan, menemukannya pada tahap itu.",
            points: [
              "Rute pengamatan tetap dengan hitungan tercatat, bukan sekadar kesan",
              "Perangkap lekat yang dipetakan untuk menemukan tekanan hama per zona",
              "Pencitraan dan sensor hiperspektral untuk menandai stres sebelum gejala terlihat",
            ],
          },
          "hygiene-protocol": {
            title: "Protokol kebersihan",
            summary:
              "Sebagian besar wabah masuk lewat sepatu, tangan, dan alat. Protokol kebersihan adalah bagian perlindungan tanaman yang paling tidak menarik, tetapi paling menguntungkan.",
            points: [
              "Pintu masuk terkendali dengan celup kaki, pakaian khusus, dan kebersihan tangan",
              "Disinfeksi alat antarbaris dan antarblok",
              "Pembersihan dan disinfeksi menyeluruh di antara siklus tanam",
            ],
          },
          pollination: {
            title: "Penyerbukan",
            summary:
              "Menutup tanaman berarti juga menutup jalan bagi penyerbuknya. Pembentukan buah lalu menjadi sesuatu yang harus direncanakan petani dengan sengaja.",
            points: [
              "Koloni bumblebee atau lebah tanpa sengat yang dikelola di dalam struktur",
              "Penyerbukan mekanis dan berbantuan aliran udara bila koloni tidak praktis",
              "Iklim dijaga dalam rentang yang membuat serbuk sari tetap viabel",
            ],
          },
        },
      },
    },
  },

  technology: {
    label: "Teknologi",
    eyebrow: "Teknologi",
    title: "Sistem di balik",
    accent: "lingkungan terkendali",
    lede: "Struktur, iklim, air, dan kendali. Masing-masing adalah disiplin tersendiri, dan semuanya hanya bekerja bila dirancang sebagai satu sistem.",
    groups: {
      "structure-and-envelope": {
        title: "Struktur dan selubung",
        intro:
          "Bangunan adalah instrumen iklim. Tinggi, ventilasi, dan penutupnya menentukan seberapa berat kerja mesin sesudahnya.",
        linkLabel: "Desain bangunan",
        topics: {
          foundation: {
            title: "Fondasi",
            summary:
              "Lokasi tropis membawa tanah lunak, hujan lebat, dan bekas lahan sawah. Fondasi harus menangani penurunan tanah dan air jauh sebelum menangani angin.",
            points: [
              "Penilaian daya dukung tanah dan risiko penurunan di lahan alih fungsi",
              "Lantai yang ditinggikan dan drainase yang menjauh dari area tanam",
              "Angkur yang dirancang untuk gaya angkat saat badai",
            ],
          },
          "steel-structure": {
            title: "Struktur baja",
            summary:
              "Tinggi talang adalah angka paling menentukan dalam desain. Rumah tanam yang lebih tinggi menampung penyangga udara yang lebih besar dan stabil, persis yang dibutuhkan iklim panas.",
            points: [
              "Tinggi talang yang lega untuk penyangga termal dan sebaran cahaya",
              "Bentang dan beban disesuaikan dengan angin dan peralatan yang digantung di rangka",
              "Perlindungan korosi untuk kondisi lembap dan pesisir",
            ],
          },
          "aluminium-system": {
            title: "Sistem aluminium",
            summary:
              "Sistem penutup adalah tempat greenhouse membocorkan udara, air, dan uang. Profil dan karet perapat menentukan apakah struktur mampu menahan iklim yang sudah Anda bayar.",
            points: [
              "Profil untuk plastik film, polikarbonat, atau kaca sesuai anggaran dan kebutuhan cahaya",
              "Perapatan dan saluran embun yang dirancang untuk kelembapan tinggi",
              "Komponen yang mudah diganti tanpa membongkar bentang",
            ],
          },
          ventilation: {
            title: "Ventilasi",
            summary:
              "Di daerah tropis, ventilasi adalah sistem pendingin utama. Selebihnya hanyalah pelengkap.",
            points: [
              "Ventilasi atap dan samping dirancang untuk beban matahari puncak, bukan kondisi rata-rata",
              "Tata letak yang memanfaatkan angin dominan dan efek cerobong sekaligus",
              "Kendali ventilasi otomatis yang merespons suhu, kelembapan, dan hujan",
            ],
          },
          "insect-netting": {
            title: "Jaring serangga",
            summary:
              "Jaring adalah perlindungan tanaman termurah yang ada, dan selalu mengorbankan aliran udara. Tugas desainnya adalah mencari keseimbangan yang melindungi tanpa membuat tanaman kepanasan.",
            points: [
              "Ukuran mata jaring dipilih sesuai hama sasaran, mulai dari thrips",
              "Luas ventilasi diperbesar untuk mengimbangi hambatan dari jaring",
              "Rutinitas inspeksi dan perbaikan, karena satu sobekan meruntuhkan seluruh penghalang",
            ],
          },
          "service-building": {
            title: "Bangunan servis",
            summary:
              "Sortasi, pengemasan, penyimpanan, dan kendali kebersihan berada di luar area tanam. Memisahkannya melindungi tanaman sekaligus produk.",
            points: [
              "Penanganan pascapanen dan cold storage di samping area tanam",
              "Ruang irigasi untuk tangki, dosing, dan filtrasi",
              "Satu titik untuk pintu masuk, ganti pakaian, dan kendali kebersihan",
            ],
          },
          "rainwater-collection": {
            title: "Penampungan air hujan",
            summary:
              "Atap greenhouse adalah daerah tangkapan yang luas dan bersih. Di negara bercurah hujan tinggi, itulah air irigasi terbaik yang ada, dan datang gratis.",
            points: [
              "Kapasitas talang dan penampungan yang cukup untuk melewati musim kemarau",
              "Pembuangan air hujan pertama (first flush) dan filtrasi sebelum disimpan",
              "Strategi pencampuran dengan air tanah saat cadangan menipis",
            ],
          },
        },
      },
      "heat-humidity-air": {
        title: "Panas, kelembapan, dan udara",
        intro:
          "Tujuannya bukan greenhouse yang sejuk, tetapi tanaman yang bertranspirasi stabil sepanjang hari. Artinya panas, kelembapan, dan karbon dioksida dikelola bersama.",
        linkLabel: "Strategi iklim",
        topics: {
          cooling: {
            title: "Pendinginan",
            summary:
              "Beban radiasi matahari adalah tantangan utama. Pendinginan termurah adalah panas yang tidak pernah dibiarkan masuk, jadi naungan dan ventilasi didahulukan sebelum mesin.",
            points: [
              "Paranet dan screen difus untuk memangkas beban radiasi puncak",
              "Pendinginan evaporatif bila udara yang masuk cukup kering untuk memberi manfaat",
              "Pendinginan mekanis khusus untuk jam-jam yang benar-benar membutuhkannya",
            ],
          },
          "humidity-control": {
            title: "Kendali kelembapan",
            summary:
              "Kelembapan tinggi menghambat transpirasi, dan tanaman yang tidak bisa bertranspirasi tidak bisa menyerap kalsium atau membuang panas. Inilah masalah khas greenhouse tropis.",
            points: [
              "Defisit tekanan uap (VPD) sebagai target kendali yang sebenarnya",
              "Pergerakan udara untuk memecah lapisan batas di sekitar daun",
              "Dehumidifikasi dan pertukaran udara terkendali bila ventilasi tidak cukup",
            ],
          },
          horticoolers: {
            title: "Horticooler dan pengolahan udara",
            summary:
              "Unit pengolah udara mengondisikan dan menyebarkan udara saat strategi pasif sudah tidak cukup, terutama di rumah tanam semi-tertutup dan plant factory.",
            points: [
              "Udara terkondisi dialirkan merata ke kanopi, bukan ke ruang atap",
              "Pendinginan dan dehumidifikasi dalam satu tahap pengolahan",
              "Operasi tertutup yang menahan serangga dan patogen di luar sambil mengelola iklim",
            ],
          },
          "co2-enrichment": {
            title: "Pengayaan CO2",
            summary:
              "Di rumah tanam yang rapat, karbon dioksida menjadi faktor pembatas fotosintesis jauh sebelum cahaya. Pengayaan baru masuk akal bila rumah tanam mampu menahannya.",
            points: [
              "Ukur dulu untuk memastikan apakah kadar CO2 memang turun",
              "Dosis yang diseimbangkan dengan ventilasi yang dibutuhkan iklim",
              "Paling layak di struktur semi-tertutup dan plant factory",
            ],
          },
        },
      },
      "water-and-nutrition": {
        title: "Air dan nutrisi",
        intro:
          "Air masuk berkualitas, nutrisi disetel tepat, air drain dipulihkan. Strategi air tertutup adalah pilihan yang berkelanjutan sekaligus ekonomis.",
        linkLabel: "Strategi air",
        topics: {
          "pre-treatment": {
            title: "Pra-pengolahan",
            summary:
              "Air baku menentukan seluruh desain. Zat besi, kesadahan, salinitas, dan patogen harus ditangani dulu sebelum resep nutrisi ada artinya.",
            points: [
              "Analisis lengkap air baku sebagai titik awal",
              "Filtrasi, penghilangan zat besi, dan pelunakan sesuai kebutuhan",
              "Disinfeksi agar patogen tidak masuk ke jalur irigasi",
            ],
          },
          fertilization: {
            title: "Pemupukan",
            summary:
              "Resep nutrisi ditulis untuk tanaman, fase, dan iklim tertentu. Resep itu berubah seiring perubahan tanaman dan cuaca.",
            points: [
              "Resep diformulasikan dari analisis air baku, bukan dari tabel umum",
              "Penyesuaian menurut fase tanaman dan musim",
              "Verifikasi melalui analisis larutan dan air drain",
            ],
          },
          dosing: {
            title: "Dosing",
            summary:
              "Unit dosing adalah tempat resep menjadi kenyataan. Akurasi dan keandalannya langsung terlihat pada keseragaman tanaman.",
            points: [
              "Dosing otomatis yang dikendalikan ke target EC dan pH",
              "Injeksi multi-kanal agar tiap unsur bisa diatur terpisah",
              "Alarm dan pengaman, karena gangguan dosing berarti kerugian tanaman yang cepat",
            ],
          },
          "post-treatment": {
            title: "Pasca-pengolahan",
            summary:
              "Air yang sudah melewati zona akar membawa nutrisi dan mungkin juga patogen. Mengolahnya adalah yang membuat resirkulasi aman.",
            points: [
              "Filtrasi untuk menyaring bahan organik dan partikel",
              "Disinfeksi dengan ultraviolet, panas, atau filtrasi pasir lambat",
              "Verifikasi sebelum air kembali ke pasokan",
            ],
          },
          "drainwater-recycling": {
            title: "Daur ulang air drain",
            summary:
              "Resirkulasi adalah alasan budidaya lingkungan terkendali dikenal hemat air. Resirkulasi juga mencegah pupuk keluar dari lokasi sebagai pencemaran.",
            points: [
              "Air drain ditampung, diukur, dan dianalisis, bukan dibuang",
              "Nutrisi dipulihkan dan diseimbangkan kembali ke pasokan",
              "Pemakaian air dan pupuk per satuan produksi turun tajam",
            ],
          },
          hydroponics: {
            title: "Hidroponik dan substrat",
            summary:
              "Bertanam tanpa tanah memberi kendali langsung atas zona akar, dan menghapus satu kategori penuh penyakit tular tanah dari persoalan.",
            points: [
              "Budidaya substrat dengan cocopeat atau rockwool untuk tanaman buah",
              "Sistem deep flow dan NFT untuk tanaman daun",
              "Kelembapan, suhu, dan oksigen zona akar dikelola sebagai variabel kendali",
            ],
          },
        },
      },
      "control-and-closed-systems": {
        title: "Kendali dan sistem tertutup",
        intro:
          "Lapisan yang menyatukan semuanya: perangkat lunak kendali, strategi energi dan air, serta produksi yang sepenuhnya tertutup.",
        linkLabel: "Sistem kendali",
        topics: {
          automation: {
            title: "Otomasi dan kendali",
            summary:
              "Sensor, pengendali, dan dashboard yang menjalankan rumah tanam sesuai strategi, bukan lewat serangkaian reaksi manual.",
            points: [
              "Iklim, irigasi, dan pencahayaan di bawah kendali yang terkoordinasi",
              "Pencatatan terus-menerus agar setiap keputusan bisa ditinjau terhadap hasilnya",
              "Pemantauan jarak jauh dan alarm untuk kondisi di luar rentang",
              "Perangkat keras terbuka dan terjangkau di mana pun ia mampu menjalankan tugasnya",
            ],
          },
          sustainability: {
            title: "Keberlanjutan",
            summary:
              "Efisiensi sumber daya bukan fitur terpisah. Dalam sistem tertutup, itulah wujud rekayasa yang baik.",
            points: [
              "Air diresirkulasi, bukan dibuang",
              "Pupuk tetap di dalam siklus dan tidak masuk ke perairan",
              "Kebutuhan energi dikurangi lewat desain sebelum dipenuhi oleh pasokan",
              "Pembangkit surya disesuaikan dengan beban siang hari fasilitas",
            ],
          },
          "plant-factories": {
            title: "Plant factory",
            summary:
              "Produksi bertingkat yang sepenuhnya tertutup dengan cahaya buatan. Iklim sepenuhnya lepas dari cuaca di luar, dengan konsekuensi tagihan energi.",
            points: [
              "Budidaya bertingkat dengan resep cahaya yang disetel per tanaman",
              "Sepenuhnya lepas dari musim, cuaca, dan kualitas lahan",
              "Hasil per meter persegi tertinggi sekaligus intensitas energi tertinggi",
              "Paling cocok untuk tanaman siklus pendek bernilai tinggi yang dekat dengan konsumen",
            ],
          },
        },
      },
    },
  },

  greenhouses: {
    label: "Greenhouse",
    eyebrow: "Greenhouse",
    title: "Struktur untuk",
    accent: "hortikultura tropis",
    lede: "Dari screenhouse berbiaya rendah hingga plant factory yang sepenuhnya tertutup. Setiap langkah memberi kendali lebih besar, dan sebagai gantinya menuntut modal dan keterampilan lebih banyak.",
    groups: {
      "permanent-structures": {
        title: "Struktur baja permanen",
        intro:
          "Standar yang tahan lama: rangka baja galvanis yang membawa plastik film, polikarbonat, atau kaca. Dibangun untuk puluhan tahun pemakaian dan untuk peralatan yang dibutuhkan iklim terkendali.",
        linkLabel: "Dibangun untuk bertahan",
        lede: "Greenhouse baja adalah pilihan jangka panjang. Biaya awalnya lebih besar, dan sebagai gantinya Anda mendapat struktur yang menjaga bentuknya, mampu membawa screen dan irigasi, serta bisa ditingkatkan alih-alih diganti.",
        topics: {
          "frame-and-lifespan": {
            title: "Rangka dan umur pakai",
            summary:
              "Baja galvanis celup panas dipilih untuk kondisi lembap, kadang pesisir, tempat korosi, bukan beban, yang mengakhiri umur sebuah struktur.",
            points: [
              "Puluhan tahun pemakaian dengan perawatan struktur yang rendah",
              "Perlindungan korosi untuk kelembapan dan udara bergaram",
              "Komponen dapat diganti tanpa membongkar seluruh bentang",
            ],
          },
          "gutter-height": {
            title: "Tinggi talang dan iklim",
            summary:
              "Ketinggian adalah kendali iklim termurah yang ada. Rumah tanam yang lebih tinggi menampung penyangga udara lebih besar, yang meredam puncak siang hari sebelum mesin apa pun menyala.",
            points: [
              "Volume udara besar yang meredam fluktuasi suhu",
              "Sebaran cahaya yang lebih baik di seluruh kanopi",
              "Ruang untuk screen, talang, dan tanaman high-wire",
            ],
          },
          "covering-choice": {
            title: "Pilihan penutup",
            summary:
              "Plastik film, polikarbonat, dan kaca berbeda dalam transmisi cahaya, umur pakai, dan biaya. Pilihan yang tepat bergantung pada tanaman dan berapa lama fasilitas harus bertahan.",
            points: [
              "Plastik film: biaya terendah, diganti berkala",
              "Polikarbonat: awet, difusi baik, biaya menengah",
              "Kaca: transmisi tertinggi dan umur terpanjang, biaya tertinggi",
            ],
          },
          "upgrade-path": {
            title: "Ruang untuk ditingkatkan",
            summary:
              "Rangka baja layak dipilih bila Anda memperkirakan usaha akan berkembang menuju kendali yang lebih besar daripada saat memulai.",
            points: [
              "Screen, pendinginan, dan CO2 ditambahkan kemudian tanpa membangun ulang",
              "Beban untuk irigasi, pencahayaan, dan sensor diperhitungkan sejak awal",
              "Investasi bertahap seiring usaha membuktikan diri",
            ],
          },
        },
      },
      "local-material-structures": {
        title: "Struktur bahan lokal",
        intro:
          "Struktur dari bahan lokal memangkas biaya modal secara drastis dan membuat budidaya terlindung terjangkau bagi petani kecil dan kelompok tani.",
        linkLabel: "Bangunan terjangkau",
        lede: "Tidak semua petani membutuhkan, atau mampu membiayai, greenhouse baja. Struktur bambu atau kayu yang dibangun dengan baik memberikan dua perlindungan yang paling penting, dari hujan dan dari serangga, dengan sebagian kecil biayanya.",
        topics: {
          "local-materials": {
            title: "Bahan lokal, perbaikan lokal",
            summary:
              "Struktur dari bahan yang tersedia di sekitar bisa dirawat oleh penggunanya sendiri, tanpa menunggu pemasok.",
            points: [
              "Bambu dan kayu yang didapat dan dikerjakan secara lokal",
              "Perbaikan murah dan cepat setelah kerusakan akibat badai",
              "Keterampilan konstruksi yang tetap tinggal di masyarakat",
            ],
          },
          "highest-return-protections": {
            title: "Dua perlindungan paling menguntungkan",
            summary:
              "Sebagian besar kenaikan hasil dan mutu dari budidaya terlindung berasal dari menjaga tanaman dari hujan dan serangga. Keduanya bisa dicapai dengan murah.",
            points: [
              "Naungan dari hujan, yang menekan penyakit daun secara tajam",
              "Jaring serangga, yang mengurangi tekanan hama dan penyemprotan",
              "Pengelolaan naungan pada jam-jam terpanas",
            ],
          },
          "honest-limits": {
            title: "Batasan yang jujur",
            summary:
              "Struktur berbiaya rendah adalah langkah pertama, bukan greenhouse versi kecil. Penting untuk jelas tentang apa yang tidak bisa dilakukannya.",
            points: [
              "Umur pakai lebih pendek daripada baja, dengan pembangunan ulang berkala",
              "Kendali iklim terbatas selain ventilasi dan naungan",
              "Talang lebih rendah, sehingga penyangga termal lebih kecil",
            ],
          },
          "first-step": {
            title: "Langkah pertama yang realistis",
            summary:
              "Bagi banyak kelompok tani, urutan yang tepat adalah belajar budidaya terlindung dengan murah, membuktikan pasarnya, lalu berinvestasi ulang ke struktur yang lebih mumpuni.",
            points: [
              "Risiko modal lebih rendah selama usaha masih belajar",
              "Protokol dan kebiasaan yang bisa dibawa ke fasilitas lebih besar nanti",
              "Bukti untuk pembiayaan tahap berikutnya",
            ],
          },
        },
      },
      "fully-managed-environments": {
        title: "Lingkungan terkelola penuh",
        intro:
          "Disiplin yang utuh: struktur, iklim, irigasi, dan kendali dirancang bersama, sehingga lingkungan tumbuh menjadi serangkaian keputusan, bukan ramalan.",
        linkLabel: "Disiplin yang utuh",
        lede: "Pertanian lingkungan terkendali bukan jenis bangunan, melainkan cara kerja. Struktur, sistem iklim, irigasi, dan data semuanya melayani satu tujuan: menempatkan petani sebagai pengendali lingkungan, bukan sekadar bereaksi terhadapnya.",
        topics: {
          "designed-as-one-system": {
            title: "Dirancang sebagai satu sistem",
            summary:
              "Struktur, iklim, dan irigasi saling membatasi. Merancangnya secara terpisah membuat fasilitas akhirnya melawan dirinya sendiri.",
            points: [
              "Kapasitas ventilasi disesuaikan dengan penutup dan beban matahari",
              "Strategi irigasi disesuaikan dengan iklim yang benar-benar bisa dijaga rumah tanam",
              "Sistem kendali ditentukan bersama perangkat keras, bukan sesudahnya",
            ],
          },
          "steer-to-a-target": {
            title: "Arahkan ke target tanaman",
            summary:
              "Setpoint bukan angka yang terasa nyaman, melainkan kondisi yang dibutuhkan tanaman agar bertranspirasi dan tumbuh stabil sepanjang hari.",
            points: [
              "VPD dijaga dalam rentang kerja tanaman",
              "Zona akar dan kanopi dikelola bersama, tidak terpisah",
              "Strategi disesuaikan menurut fase tanaman, bukan dibiarkan tetap",
            ],
          },
          "data-at-the-centre": {
            title: "Data sebagai pusat",
            summary:
              "Pengukuran terus-menerus adalah yang mengubah satu musim tanam menjadi sesuatu yang bisa ditinjau, dijelaskan, dan diperbaiki.",
            points: [
              "Iklim, zona akar, dan cahaya dicatat terus-menerus",
              "Pengukuran tanaman tanpa merusak untuk mendeteksi stres lebih awal",
              "Evaluasi musim tempat data menentukan rencana berikutnya",
            ],
          },
          "predictable-output": {
            title: "Hasil yang dapat diprediksi",
            summary:
              "Nilai komersial dari kendali bukan hanya hasil panen yang lebih tinggi, tetapi kemampuan menjanjikan volume dan mutu kepada pembeli pada tanggal tertentu.",
            points: [
              "Produksi sepanjang tahun tanpa bergantung musim",
              "Mutu yang konsisten sehingga kontrak tetap terjaga",
              "Perencanaan yang bisa diandalkan rantai dingin dan pembeli",
            ],
          },
        },
      },
      "closed-plant-factories": {
        title: "Plant factory tertutup",
        intro:
          "Produksi tertutup, bertingkat, dan bercahaya buatan tanpa ketergantungan pada sinar matahari atau lahan. Pilihan paling terkendali yang ada, sekaligus paling boros energi.",
        linkLabel: "Produksi bertingkat",
        lede: "Plant factory menghapus cuaca dari persoalan sepenuhnya. Setiap input dipilih: spektrum dan durasi cahaya, suhu, kelembapan, karbon dioksida, dan nutrisi. Apa yang Anda dapat dalam kendali, Anda bayar dengan energi.",
        topics: {
          "stacked-production": {
            title: "Produksi bertingkat",
            summary:
              "Bertanam secara bertingkat melipatgandakan hasil dari satu tapak, dan itulah yang membuat produksi layak di lahan mahal yang dekat dengan konsumen.",
            points: [
              "Beberapa tingkat tanam dalam satu bangunan",
              "Hasil per meter persegi tertinggi dari sistem mana pun",
              "Tidak bergantung pada kualitas lahan atau drainase",
            ],
          },
          "light-recipes": {
            title: "Resep cahaya",
            summary:
              "Dengan cahaya buatan, spektrum dan fotoperiode menjadi input yang bisa diatur untuk membentuk hasil, warna, tekstur, dan rasa.",
            points: [
              "Spektrum disetel per tanaman dan per fase pertumbuhan",
              "Fotoperiode diatur untuk mendorong perkembangan sesuai jadwal",
              "Cahaya merata di setiap tingkat",
            ],
          },
          "energy-strategy": {
            title: "Strategi energi",
            summary:
              "Energi adalah faktor ekonomi penentu. Plant factory hanya berhasil bila nilai tanaman dan rencana energi dipertimbangkan bersama sejak hari pertama.",
            points: [
              "Pencahayaan dan pendinginan sebagai beban terbesar",
              "Panas dari lampu dipulihkan, bukan sekadar dibuang",
              "Pembangkit surya disesuaikan dengan beban siang hari",
            ],
          },
          "best-fit-crops": {
            title: "Paling cocok untuk apa",
            summary:
              "Plant factory menguntungkan untuk tanaman siklus pendek, bernilai tinggi, dan kompak. Plant factory juga instrumen riset yang sangat baik.",
            points: [
              "Sayuran daun, herba, dan microgreen",
              "Produksi bibit dan bahan pindah tanam dengan mutu konsisten",
              "Riset yang menuntut setiap variabel dijaga stabil",
            ],
          },
        },
      },
    },
  },
};

function localizeSection(section: IFSection): IFSection {
  const s = IF_SECTIONS_ID[section.slug];
  if (!s) return section;
  const { groups: groupCopy, ...sectionCopy } = s;
  return {
    ...section,
    ...sectionCopy,
    groups: section.groups.map((group) => {
      const g = groupCopy[group.slug];
      if (!g) return group;
      const { topics: topicCopy, ...rest } = g;
      return {
        ...group,
        ...rest,
        topics: group.topics.map((topic) => ({ ...topic, ...topicCopy[topic.slug] })),
      };
    }),
  };
}

const IF_SECTIONS_LOCAL_ID: IFSection[] = IF_SECTIONS.map(localizeSection);

/** Sections, groups, and topics in the visitor's language (same slugs and icons). */
export function ifSectionsFor(lang: Lang): IFSection[] {
  return lang === "id" ? IF_SECTIONS_LOCAL_ID : IF_SECTIONS;
}

/** `findIFSection` in the visitor's language. */
export function findIFSectionFor(slug: string, lang: Lang): IFSection | undefined {
  return ifSectionsFor(lang).find((s) => s.slug === slug);
}

const IF_PILLARS_ID: Record<string, { label: string; blurb: string }> = {
  approach: {
    label: "Pendekatan",
    blurb:
      "Tanaman apa, lokasi mana, dan seberapa banyak kendali yang benar-benar sepadan bagi tanaman dan hitungan bisnisnya.",
  },
  cultivation: {
    label: "Budidaya",
    blurb:
      "Tanaman di bawah naungan, dari tomat hingga selada, herba, dan beri, ditambah disiplin kesehatan tanaman yang menjaganya tetap bersih.",
  },
  technology: {
    label: "Teknologi",
    blurb: "Bangunan, udara, air, dan lapisan kendali, dirancang sebagai satu sistem untuk kondisi tropis.",
  },
  greenhouses: {
    label: "Greenhouse",
    blurb:
      "Dari bangunan bahan lokal yang terjangkau hingga struktur baja permanen dan plant factory yang sepenuhnya tertutup.",
  },
};

export function ifPillarsFor(lang: Lang): typeof IF_PILLARS {
  return localizeAll(IF_PILLARS, IF_PILLARS_ID, (p) => p.slug, lang);
}

const IF_TROPICAL_POINTS_ID: Record<string, { title: string; body: string }> = {
  "Humidity, not cold, is the constraint": {
    title: "Kendalanya kelembapan, bukan dingin",
    body: "Tugas di sini adalah mengeluarkan panas dan uap air, bukan menahannya, sehingga defisit tekanan uap (VPD), bukan suhu saja, menjadi target kendali.",
  },
  "Light is abundant, heat comes with it": {
    title: "Cahaya melimpah, panas ikut datang",
    body: "Di dekat khatulistiwa, sinar matahari jarang menjadi pembatas. Mengelola panas yang datang bersamanya adalah pembeda antara struktur yang bekerja dan sebuah oven.",
  },
  "Pest pressure never pauses": {
    title: "Tekanan hama tidak pernah berhenti",
    body: "Tanpa musim dingin yang memutus siklus hidup hama, pencegahan masuk dan kebersihan harus bekerja sepanjang tahun, bukan musiman.",
  },
  "Rain is a resource, not a nuisance": {
    title: "Hujan adalah sumber daya, bukan gangguan",
    body: "Curah hujan tinggi menjadikan tangkapan atap sumber irigasi paling bersih dan murah, asalkan penampungan dan pembuangan air hujan pertama dirancang sejak awal.",
  },
};

export function ifTropicalPointsFor(lang: Lang): typeof IF_TROPICAL_POINTS {
  return localizeAll(IF_TROPICAL_POINTS, IF_TROPICAL_POINTS_ID, (p) => p.title, lang);
}

const IF_CAPABILITIES_ID: Record<string, { label: string }> = {
  "Climate control systems": { label: "Sistem kendali iklim" },
  "Hyperspectral plant sensing": { label: "Sensor tanaman hiperspektral" },
  "IoT sensor networks": { label: "Jaringan sensor IoT" },
  "Hydroponics and fertigation": { label: "Hidroponik dan fertigasi" },
  "Plant factory systems": { label: "Sistem plant factory" },
  "Automation and dashboards": { label: "Otomasi dan dashboard" },
  "Water recirculation": { label: "Resirkulasi air" },
  "Pollination and IPM": { label: "Penyerbukan dan PHT" },
};

export function ifCapabilitiesFor(lang: Lang): typeof IF_CAPABILITIES {
  return localizeAll(IF_CAPABILITIES, IF_CAPABILITIES_ID, (c) => c.label, lang);
}

const IF_PROCESS_ID: Record<string, { title: string; body: string }> = {
  "01": {
    title: "Lingkup dan lokasi",
    body: "Kami melihat tanaman, pasar, lokasi, serta air dan listrik yang tersedia, lalu menyampaikan terus terang apakah lingkungan terkendali memang jawaban yang tepat.",
  },
  "02": {
    title: "Desain dan uji coba",
    body: "Brief desain dan, bila perlu, blok uji coba berinstrumen agar angka di balik rencana berasal dari lokasi Anda, bukan dari katalog.",
  },
  "03": {
    title: "Bangun dan pasang instrumen",
    body: "Struktur, iklim, dan irigasi diterapkan bersama, dengan sensor dan kendali dipasang sejak awal, bukan ditambahkan belakangan.",
  },
  "04": {
    title: "Operasikan dan tingkatkan",
    body: "Protokol, pelatihan, dan operasi bersama selama siklus-siklus pertama, lalu evaluasi rutin tempat data yang tercatat menentukan target musim berikutnya.",
  },
};

export function ifProcessFor(lang: Lang): typeof IF_PROCESS {
  return localizeAll(IF_PROCESS, IF_PROCESS_ID, (p) => p.step, lang);
}
