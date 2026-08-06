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
    title: "What, where, and",
    accent: "how to grow",
    lede: "Every controlled-environment project comes down to three decisions. Get them right and the system earns its keep. Get them wrong and no amount of technology will rescue it.",
    groups: [
      {
        slug: "what-to-grow",
        title: "What to grow",
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
        slug: "where-to-grow",
        title: "Where to grow",
        intro:
          "Site selection quietly sets your operating cost for the next decade. Altitude, water, power, and distance to market matter more than the shape of the roof.",
        linkLabel: "Location analysis",
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
        slug: "how-to-grow",
        title: "How to grow",
        intro:
          "There is a spectrum between an open field and a fully closed plant factory. The right point on it is the one your crop, climate, and team can actually sustain.",
        linkLabel: "Growing systems",
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
    title: "Crops, systems, and",
    accent: "crop protection",
    lede: "What we grow under cover, how we grow it, and how we keep it healthy without leaning on chemistry.",
    groups: [
      {
        slug: "vegetables",
        title: "Vegetables",
        intro:
          "Fruiting vegetables reward tight climate and nutrition control. They are demanding, and they are where controlled-environment growing shows its value most clearly.",
        linkLabel: "Vegetable crops",
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
        slug: "indoor-produce",
        title: "Indoor produce",
        intro:
          "Short-cycle crops grown in greenhouses and plant factories, where light recipe, root-zone control, and hygiene do most of the work.",
        linkLabel: "Indoor produce",
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
        slug: "crop-protection",
        title: "Crop protection",
        intro:
          "A sealed structure is the first line of defence. Everything after that is discipline: watch closely, act early, and keep the house clean.",
        linkLabel: "Crop protection",
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
        slug: "structure",
        title: "Structure",
        intro:
          "The building is a climate instrument. Its height, venting, and covering decide how much work the machinery has to do afterwards.",
        linkLabel: "Structure systems",
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
        slug: "climate",
        title: "Climate",
        intro:
          "The goal is not a cool greenhouse, it is a crop that transpires steadily all day. That means managing heat, humidity, and carbon dioxide together.",
        linkLabel: "Climate systems",
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
        slug: "irrigation",
        title: "Irrigation",
        intro:
          "Water quality in, nutrition dialled in, drain water recovered. A closed water strategy is both the sustainable option and the economical one.",
        linkLabel: "Irrigation systems",
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
        slug: "more-technology",
        title: "More technology",
        intro:
          "The layer that ties the rest together: control software, energy and water strategy, and fully closed production.",
        linkLabel: "Automation and more",
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
        slug: "steel-greenhouse",
        title: "Steel greenhouse",
        intro:
          "The durable standard: a galvanised steel frame carrying film, polycarbonate, or glass. Built for decades of service and for the equipment a controlled climate needs.",
        linkLabel: "Steel structures",
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
        slug: "bamboo-greenhouse",
        title: "Bamboo and low-cost structures",
        intro:
          "Locally sourced structures cut capital cost dramatically and put protected cultivation within reach of smallholders and farmer groups.",
        linkLabel: "Low-cost structures",
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
        slug: "controlled-environment-agriculture",
        title: "Controlled-environment agriculture",
        intro:
          "The full discipline: structure, climate, irrigation, and control designed together, so the growing environment becomes a set of decisions rather than a forecast.",
        linkLabel: "The CEA discipline",
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
        slug: "plant-factories",
        title: "Plant factories",
        intro:
          "Closed, stacked, artificially lit production with no dependence on sunlight or land. The most controlled option available, and the most energy intensive.",
        linkLabel: "Plant factories",
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
      "What to grow, where to grow it, and how much control the crop and the business case actually justify.",
    icon: Target,
  },
  {
    slug: "cultivation",
    label: "Cultivation",
    blurb:
      "Crops under cover, from tomato to leafy greens and strawberries, and the crop protection that keeps them clean.",
    icon: Leaf,
  },
  {
    slug: "technology",
    label: "Technology",
    blurb:
      "Structure, climate, irrigation, and control, designed as one system for tropical conditions.",
    icon: Cpu,
  },
  {
    slug: "greenhouses",
    label: "Greenhouses",
    blurb:
      "From low-cost bamboo structures to steel greenhouses and fully closed plant factories.",
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
