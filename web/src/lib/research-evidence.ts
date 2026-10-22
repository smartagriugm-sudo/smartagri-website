// Evidence behind each research area: the center's own projects (from the
// Smart Agriculture Research Center profile deck) and the student theses
// supervised at the center, grouped into the six flagship areas. Source:
// the smartagri research folder (profile deck plus 15 undergraduate theses,
// 4 master's theses and 1 doctoral proposal), summarised in
// Ringkasan_Penelitian_SmartAgri.md. Figures are cited from each document's
// abstract and conclusions; center projects are limited to what the slides
// show. Slide images: lib/assets `researchSlide`, thesis framework figures:
// `researchFramework`.

export type EvidenceStat = { value: string; label: string };

export type CenterProject = {
  title: string;
  summary: string;
  points: string[];
  /** Slide numbers in the profile deck that illustrate the project. */
  slides: number[];
  partners?: string[];
  people?: string[];
};

export type StudyLevel = "Undergraduate" | "Master's" | "Doctoral";

export type StudentStudy = {
  /** Code from the research summary, e.g. "S1-13"; also the framework figure. */
  code: string;
  level: StudyLevel;
  author: string;
  /** Team member slug when the author is on the team page. */
  member?: string;
  year: number;
  /** Shown next to the level when the work is not a finished thesis. */
  status?: string;
  title: string;
  tags: string[];
  summary: string;
  results: EvidenceStat[];
  points: string[];
};

export type AreaEvidence = {
  highlights: EvidenceStat[];
  projects: CenterProject[];
  studies: StudentStudy[];
};

export const STUDY_KIND: Record<StudyLevel, string> = {
  Undergraduate: "Undergraduate thesis",
  "Master's": "Master's thesis",
  Doctoral: "Doctoral research",
};

export const RESEARCH_EVIDENCE: Record<string, AreaEvidence> = {
  // ------------------------------------------------------------ open field
  "open-field-technology": {
    highlights: [
      { value: "16.9%", label: "less water than farmers' own watering, automatic sprinklers on coastal sand" },
      { value: "92.8%", label: "Christiansen uniformity after raising sprinkler pressure, up from 77.9%" },
      { value: "0.946", label: "R² for non-destructive sugar content of peeled salak with portable VIS/NIR" },
    ],
    projects: [
      {
        title: "Local and global subsystem framework for outdoor smart farming",
        summary:
          "The center's base architecture for the field: a local management subsystem of sensors, controller and actuators on site, and a global subsystem of online database, system configuration, computational analysis and web and mobile apps.",
        points: [
          "Simple, flexible environmental monitoring and control through smart devices",
          "Reused across later work: coastal sprinklers, estate soil moisture, smart greenhouses and plant electrical signals",
        ],
        slides: [18],
        partners: ["Ministry of Public Works and Housing", "Kyushu University", "Maejo University, Thailand"],
        people: ["Andri Prima Nugroho, Ph.D. (principal investigator)"],
      },
      {
        title: "Smart bird pest detection and deterrent",
        summary:
          "Computer vision (YOLO) spots pest birds over the crop and triggers a harmonic ultrasonic acoustic deterrent, with ANSYS simulation supporting the structure and sound propagation.",
        points: [
          "Video collection, annotation and augmentation, model training, then field deployment",
          "Part of integrated pest management rather than a stand-alone scarer",
        ],
        slides: [21],
      },
      {
        title: "GPS tracking to evaluate soil tillage",
        summary:
          "GPS tracking with a cycling computer, smartphone and cloud logging evaluates how well a four-wheel tractor follows its tillage lines, including position estimates against the reference path.",
        points: ["Objective tillage quality from the tractor's own track"],
        slides: [24],
      },
      {
        title: "Automatic wheel-steering tractor",
        summary:
          "Demonstrations of a driverless auto-steering tractor (FJD LandMaster navigation system) for precision farming, shown to students and farmers.",
        points: ["Mechanisation that holds the line without a driver at the wheel"],
        slides: [25],
      },
    ],
    studies: [
      {
        code: "S1-04",
        level: "Undergraduate",
        author: "Devi Ramdani",
        year: 2026,
        title: "Evaluating sprinkler irrigation on the coastal sands of Glagah, Kulon Progo, through hydraulic analysis and Christiansen uniformity",
        tags: ["Precision irrigation", "Coastal sandy soil", "QGISRed"],
        summary:
          "Coastal sand holds little water, so how evenly a sprinkler spreads it decides how efficient the irrigation is. Lab tests (catch cans, flowmeter, manometer), hydraulic simulation in QGIS/QGISRed, uniformity analysis and water-distribution heatmaps evaluate the farmers' existing system and recommend a better layout.",
        results: [
          { value: "77.9 → 92.8%", label: "uniformity when pressure rises from 2.11 to 3.52 m" },
          { value: "14–15", label: "sprinklers per lateral, the most stable layout" },
        ],
        points: [
          "Many downstream nodes fall below the 2.109 m minimum pressure because of head loss along the lateral",
          "Uniformity is 94–95% at the start of a lateral and drops to 79.8% downstream",
          "Feeding water from the middle of the lateral is recommended; the groundwork for the IoT systems that followed",
        ],
      },
      {
        code: "S1-08",
        level: "Undergraduate",
        author: "Rizqi Asy'ari Ramadhan",
        year: 2026,
        title: "Automatic sprinkler irrigation with a hysteresis controller for water efficiency on coastal sand",
        tags: ["Precision irrigation", "IoT", "Closed-loop control"],
        summary:
          "Applies the center's local and global architecture on the coastal sands of Kulon Progo: RS485 soil moisture sensors, a solar-powered ESP32-S3 panel with GSM, the Agrieye cloud, and a pump and solenoid valve switched on and off by hysteresis thresholds.",
        results: [
          { value: "16.9%", label: "water saved, 790 L against 951 L over three days" },
          { value: "0.93–0.97", label: "R² of the three calibrated sensors" },
        ],
        points: [
          "Sensor error after calibration: MAPE 1.00–1.82%, RMSE 0.29–0.47",
          "Waters according to the actual soil moisture, monitored in real time",
        ],
      },
      {
        code: "S1-13",
        level: "Undergraduate",
        author: "Ardan Desta Vaunendra",
        member: "ardan-desta-vaunendra",
        year: 2026,
        title: "Smart irrigation control with fuzzy logic from evapotranspiration and soil moisture on sandy soil",
        tags: ["Precision irrigation", "IoT", "Fuzzy logic"],
        summary:
          "Makes the sprinkler controller respond to the weather. Campbell weather-station data (temperature, humidity, wind, radiation) become FAO-56 Penman-Monteith reference evapotranspiration, which a Mamdani fuzzy model combines with soil moisture to set how long to irrigate.",
        results: [
          { value: "≈33 min", label: "fuzzy irrigation time that lifted soil moisture to field capacity" },
          { value: "21–22 → 23–23.8%", label: "soil moisture before and after watering" },
        ],
        points: [
          "Gravimetric sensor calibration: R² 0.9382 and 0.9652",
          "Weather station, sensors, cloud (HTTP) and actuators integrated in one real-time loop",
        ],
      },
      {
        code: "S1-02",
        level: "Undergraduate",
        author: "Muhammad Ilham Al Marda",
        year: 2026,
        title: "Modelling papaya leaf health with machine learning on plant physiology data",
        tags: ["Papaya", "Machine learning", "Explainable AI"],
        summary:
          "Raw LI-COR LI-600 porometer and fluorometer readings and SPAD values from papaya leaves train a random forest that predicts SPAD and sorts leaves into healthy, moderate and unhealthy classes, explained with SHAP.",
        results: [
          { value: "80%", label: "health classification accuracy" },
          { value: "0.59", label: "R² for predicted SPAD (RMSE 9.32)" },
        ],
        points: [
          "Most influential features: electron transport rate, stomatal conductance and PSII efficiency",
          "Builds on the center's drone-based papaya health work from the leaf side",
        ],
      },
      {
        code: "S1-09",
        level: "Undergraduate",
        author: "Shidqon Fathul Muqorrobin",
        year: 2026,
        title: "Non-destructive sugar content and ripeness of salak pondoh with portable VIS/NIR spectroscopy",
        tags: ["Postharvest", "Spectroscopy", "Chemometrics"],
        summary:
          "Spectra from salak at four ripeness stages, measured with skin and peeled, are pre-processed and modelled with PLS regression, PLS-DA and a neural network to replace visual grading and destructive refractometer readings.",
        results: [
          { value: "0.946", label: "R² for sugar content, peeled fruit (RPD 4.32)" },
          { value: "90%", label: "ripeness classification accuracy, peeled (80% with skin)" },
        ],
        points: ["Whole-fruit models remain usable for field sorting (RPD above 3)"],
      },
    ],
  },

  // ------------------------------------------------------------ irrigation
  "irrigation-modernization": {
    highlights: [
      { value: "3", label: "irrigation areas running SIPASI: Wadaslintang, Mrican and Way Sekampung" },
      { value: "0.974", label: "R² of the LSTM forecasting primary canal discharge at DI Sapon" },
      { value: "0.55–4.16%", label: "error of the unsteady-flow gate model against field data" },
    ],
    projects: [
      {
        title: "SIPASI irrigation management information system",
        summary:
          "A decision support system for irrigation operation and maintenance, built because conventional rehabilitation alone was not restoring irrigation performance.",
        points: [
          "Water availability prediction, crop water requirement and if-then cropping-pattern scenarios",
          "Operation and maintenance procedures moved from paper to an information system, with SmartAWS, SmartAWLMS and SmartGateController instrumentation",
          "Registered intellectual property since 2021",
        ],
        slides: [26],
        partners: ["Directorate General of Water Resources, Ministry of Public Works"],
        people: ["Prof. Sigit Supadmo Arif", "Dr. Murtiningrum", "Andri Prima Nugroho, Ph.D."],
      },
      {
        title: "Irrigation Knowledge Management Center",
        summary:
          "A platform for sustaining irrigation know-how: online courses, content management, discussion forum, knowledge centre and an AI chatbot.",
        points: ["Captures what experienced operators know so it survives staff changes"],
        slides: [50],
      },
    ],
    studies: [
      {
        code: "S1-01",
        level: "Undergraduate",
        author: "Arinda Fadea Pramaesela",
        year: 2026,
        title: "Externalising tacit knowledge in irrigation gate operation by quantifying external factors, DI Sapon, Kulon Progo",
        tags: ["Knowledge management", "Irrigation operation"],
        summary:
          "Gate operators decide from experience. Quantification Theory I measures how farmers' requests, the previous day's rainfall and the state of the Progo River drive operated discharge at six gates over a season, and turns the pattern into an explicit-knowledge dashboard.",
        results: [
          { value: "0.83–0.95", label: "correlation between measured and predicted discharge" },
          { value: "0.906", label: "R² at Primer Bothokan (MAPE 9.98%)" },
        ],
        points: [
          "Operators' decisions follow a consistent pattern rather than chance",
          "Farmer demand and river condition dominate; accuracy drops on secondary canals with more complex downstream conditions",
          "The dashboard supports operators' judgement, it does not replace it",
        ],
      },
      {
        code: "S1-07",
        level: "Undergraduate",
        author: "Bagus Dwi Putra Atmaja",
        year: 2026,
        title: "Deep learning forecasts of primary canal discharge for cropping-pattern planning, DI Sapon",
        tags: ["Decision support", "Deep learning", "Hydrology"],
        summary:
          "Twenty hydrological and climate features from 2018–2025 feed LSTM, GRU and a parallel hybrid model over a 30-day sliding window, trained on 2018–2023, validated on 2024 and tested on 2025.",
        results: [
          { value: "0.974", label: "R² of the best model, LSTM (NSE 0.900)" },
          { value: "13.6%", label: "mean absolute percentage error" },
        ],
        points: [
          "Hydrological inputs matter more than climate inputs",
          "The 2026 forecast shows enough water for the planned cropping pattern, feeding the decision support system",
        ],
      },
      {
        code: "S2-04",
        level: "Master's",
        author: "Yusfan Ramela Putra",
        year: 2026,
        title: "Unsteady-flow model of off-take gate operation with a control system, Kengkeng secondary canal, DI Sapon",
        tags: ["Hydrodynamics", "Automatic control"],
        summary:
          "Manual gate moves cause unsteady flow and unstable water levels. A 1D Saint-Venant model solved by the method of characteristics is validated on field gate-opening and closing runs, then simulated with decentralised proportional-integral control as the basis for automatic gates.",
        results: [
          { value: "0.006–0.043 m", label: "model RMSE against field measurements" },
          { value: "300–360 s", label: "settling time for a 5 cm rise in water level" },
        ],
        points: [
          "Sudden opening causes a discharge surge; gradual closing gives a smoother profile",
          "Tuned controller gains: Kp 0.3, Ki 0.005 for a 5 cm rise; Kp 0.15, Ki 0.005 for a 20 cm drop",
        ],
      },
    ],
  },

  // ------------------------------------------------------------ estate
  "smart-estate-technology": {
    highlights: [
      { value: "4", label: "estate projects, from fertiliser planning to stress prediction" },
      { value: "6", label: "nutrients modelled for fertiliser doses: N, P, K, Mg, Ca and B" },
      { value: "3", label: "NDVI sources compared: UAV, WorldView-2 and Sentinel-2" },
    ],
    projects: [
      {
        title: "Fertiliser decision support from historical estate data",
        summary:
          "Mines estate records (area, soil type, nutrients, rainfall, production) to model doses of N, P, K, Mg, Ca and B with an artificial neural network, and serves the recommendation in a decision support system.",
        points: ["Recommendations grounded in the estate's own history"],
        slides: [28],
      },
      {
        title: "Soil moisture monitoring on suboptimal soils",
        summary:
          "Real-time soil moisture on suboptimal oil palm soils through the Agrieye cloud and a decision support dashboard, to see a water deficit coming.",
        points: ["Early warning of water deficit across blocks"],
        slides: [29],
      },
      {
        title: "AI-based rapid test for off-spec fertiliser",
        summary:
          "A field test unit with an NPK sensor, mixer, HMI screen, printer and SD card, linked to the global subsystem, flags fertiliser that does not meet its specification.",
        points: ["Keeps precision fertilising precise by checking what goes into the spreader"],
        slides: [30],
      },
      {
        title: "AI prediction of environmental stress in oil palm",
        summary:
          "Multispectral VTOL imagery (Sony RX1R II, MicaSense RedEdge-P) and an automatic weather station feed a neural network, delivered through the SmartGrow Tropics decision support system.",
        points: ["Compares NDVI from UAV, WorldView-2 and Sentinel-2"],
        slides: [22],
      },
    ],
    studies: [],
  },

  // ------------------------------------------------------------ UAV
  "smart-uav-technology": {
    highlights: [
      { value: "0.69", label: "R² mapping rice stomatal conductance from multispectral VTOL imagery" },
      { value: "0.79", label: "F1 score rating land management across 93 rice plots" },
      { value: "1,600", label: "grid cells zoned for variable-rate fertilising" },
    ],
    projects: [
      {
        title: "Automated papaya tree counting from VTOL imagery",
        summary:
          "Counts papaya trees automatically from RGB orthomosaics captured by a Trinity Pro VTOL, by tiling the mosaic and detecting trees with a convolutional neural network.",
        points: ["Evaluated with confusion matrices and training curves"],
        slides: [19],
        partners: ["Quantum Systems / Quantindo"],
      },
      {
        title: "Precision health evaluation of papaya",
        summary:
          "Rates papaya as normal, half normal or abnormal from VTOL multispectral data combined with field SPAD and LI-COR readings in a neural network.",
        points: ["Reported R² 0.39 (MSE 66.31, MAE 6.12); the basis for later leaf-level work"],
        slides: [20],
      },
    ],
    studies: [
      {
        code: "S1-05",
        level: "Undergraduate",
        author: "Faiz Ridwan Pratama",
        year: 2026,
        title: "Machine learning model of rice stomatal conductance across growth stages from multispectral VTOL imagery",
        tags: ["Rice", "UAV VTOL", "Machine learning"],
        summary:
          "Stomatal conductance is a sensitive stress indicator but is measured by hand, leaf by leaf. Five-band hybrid VTOL imagery and 37 vegetation indices, matched to field measurements, map it across the field with tuned models validated by five-fold cross-validation and explained with SHAP.",
        results: [
          { value: "0.693", label: "R² on held-out data, KNN tuned with Optuna" },
          { value: "0.027", label: "gap between cross-validation and test R², no sign of overfitting" },
        ],
        points: ["The spatial variation of the canopy spectrum tells more than its mean reflectance"],
      },
      {
        code: "S1-15",
        level: "Undergraduate",
        author: "Ilham Mubarok",
        year: 2026,
        title: "Evaluating rice land management with machine learning and multispectral VTOL imagery",
        tags: ["Rice", "UAV VTOL", "Machine learning"],
        summary:
          "NDVI, NDRE, GNDVI, OSAVI and CIRE maps of 93 paddy plots are matched to a land management index and classified with random forest, XGBoost, LightGBM and SVM.",
        results: [
          { value: "0.791", label: "F1 score of the best model, LightGBM" },
          { value: "93", label: "rice plots assessed from the air" },
        ],
        points: ["Produces a spatial map of how well each plot is being managed"],
      },
      {
        code: "S2-02",
        level: "Master's",
        author: "Hammam Mananda Harahap",
        year: 2026,
        title: "Grid zoning for precision fertilising of rice from UAV-VTOL imagery with machine learning",
        tags: ["Rice", "UAV VTOL", "Variable-rate application"],
        summary:
          "MicaSense RedEdge-P imagery from a Trinity Pro VTOL over Minggir, Sleman, with SPAD and stomatal conductance as ground truth. K-means sets fertiliser-need zones and eleven models learn them, then map planting, tillering and booting stages.",
        results: [
          { value: "0.716", label: "accuracy for two zones, HistGradientBoosting (AUC up to 0.976)" },
          { value: "1,600", label: "grid cells mapped across three growth stages" },
        ],
        points: [
          "Red-edge indices (RDVI and its variants) carry the most weight",
          "The share of cells needing fertiliser grows from planting to booting, as nitrogen demand does",
        ],
      },
    ],
  },

  // ------------------------------------------------------------ indoor
  "indoor-farming-technology": {
    highlights: [
      { value: "0.985", label: "R² of the random forest model of lettuce photosynthesis" },
      { value: "0.96–0.97", label: "R² of a low-cost 14-band spectral sensor against a reference spectrometer" },
      { value: "S2 → S3", label: "plant electrical signals, followed from master's to doctoral research" },
    ],
    projects: [
      {
        title: "Smart greenhouse architecture",
        summary:
          "A tropical smart greenhouse with temperature, humidity, radiation, CO2 and soil moisture sensing, coolers, humidifiers, microsprayers, pumps and exhaust fans, a local server and edge nodes over MQTT, the cloud and a multiplatform dashboard.",
        points: ["Control optimised on vapour pressure deficit", "Round-the-clock growth prediction, environment forecasting and yield prediction"],
        slides: [32, 33],
      },
      {
        title: "Edge computing for environmental monitoring",
        summary:
          "Node-RED, an MQTT broker and a local database keep data capture and control running in real time when the internet connection is limited.",
        points: ["The greenhouse keeps working when the link drops"],
        slides: [34],
      },
      {
        title: "VPD-based monitoring and control",
        summary:
          "Multi-node monitoring hardware and software that drives an evaporative air cooler to hold the greenhouse in the ideal vapour pressure deficit zone.",
        points: ["Efficient use of water and energy in the greenhouse"],
        slides: [35],
      },
      {
        title: "Smart greenhouse mobile app UI/UX",
        summary:
          "A mobile app for temperature, humidity, camera views and a forum, designed with design thinking: empathise, define, ideate, prototype and test.",
        points: ["Designed with the growers who use it"],
        slides: [36],
      },
      {
        title: "The center's plant factory",
        summary:
          "LED grow-light racks, nutrient tanks, dosing pumps and water sensors on the local and global subsystem with a remote dashboard. The main facility for many undergraduate to doctoral studies.",
        points: ["Host to the lettuce physiology, impedance, spectral, ERP and plant-signal studies below"],
        slides: [38],
      },
      {
        title: "Plant electrophysiology acquisition",
        summary:
          "A system that captures plant bioelectrical signals to assess physiological health in indoor farming.",
        points: ["Developed in depth in the master's and doctoral work of Saifuddin Afif"],
        slides: [39],
      },
      {
        title: "Piecewise sinusoidal lighting control",
        summary:
          "Light intensity that follows a sinusoidal pattern, compared with square, parabolic and fluctuating profiles, to reduce plant stress in the plant factory.",
        points: ["System design, simulation and implementation"],
        slides: [40],
      },
      {
        title: "Random forest model of lettuce photosynthesis",
        summary:
          "Environmental monitoring data and LI-6800 and SPAD measurements train a random forest that predicts the photosynthesis rate of lettuce.",
        points: ["R² 0.9847, RMSE 2.134, with feature importance and error analysis"],
        slides: [41],
      },
      {
        title: "Early tipburn detection in lettuce",
        summary:
          "YOLO detects tipburn from 0 to 100% on leaf images in the plant factory, from plant conditioning and dataset collection to annotation, training and deployment.",
        points: ["Catches a physiological disorder before it spreads across the tray"],
        slides: [42],
      },
      {
        title: "Plant position detection and growth monitoring",
        summary:
          "A camera on a CNC mechanism finds each hydroponic plant and tracks its canopy area over time, published to the center's website.",
        points: ["Growth curves per plant without handling the crop"],
        slides: [43],
      },
      {
        title: "Smart aeroponics with an ultrasonic atomiser",
        summary:
          "An aeroponic system with pump, nozzles, ultrasonic mist maker, root-zone temperature and humidity sensing and the Agrarise cloud.",
        points: ["The ultrasonic atomiser uses less water than mist nozzles, with higher water-use efficiency"],
        slides: [44],
      },
      {
        title: "CFD of aeroponic mist distribution",
        summary:
          "ANSYS CFD (VOF to DPM) visualises the volume fraction and droplet size of the mist to improve misting coverage.",
        points: ["Researcher: Naufal Helmi Yumnanda"],
        slides: [45],
      },
      {
        title: "VPD and stomatal dynamics for aeroponic optimisation",
        summary:
          "Physiological measurements (LI-600, SPAD-502, Elitech GSP-6), Pearson correlation in Python and a switch-case performance framework optimise aeroponics on vapour pressure deficit.",
        points: ["Ties the misting schedule to how the plant is actually responding"],
        slides: [46],
      },
      {
        title: "Low-cost smart greenhouse for Sriharjo village",
        summary:
          "A community-driven low-cost smart greenhouse at the Taruna Tani production greenhouse in Sriharjo, with automatic monitoring and control and better water and nutrient efficiency.",
        points: [
          "Low-cost controller panel, dosing pumps and web and mobile dashboard",
          "Supports the farmer group's hydroponic vegetable sales",
        ],
        slides: [52, 53],
        partners: ["Taruna Tani, Sriharjo"],
      },
    ],
    studies: [
      {
        code: "S1-10",
        level: "Undergraduate",
        author: "Aisyah Ramadhani",
        year: 2026,
        title: "Stomatal conductance dynamics of lettuce during the light period in a plant factory",
        tags: ["Plant factory", "Plant physiology"],
        summary:
          "Gas exchange (LI-6800) every ten minutes from 07:00 to 17:00 on three days, with microclimate logging, to predict stomatal conductance without a LI-COR instrument.",
        results: [
          { value: "0.880", label: "R² of a simple model from temperature, humidity and CO2" },
          { value: "0.99", label: "coupling between stomatal conductance and transpiration" },
        ],
        points: [
          "No midday depression, because the plant factory keeps VPD stable",
          "Conductance could be estimated from inexpensive microclimate sensors",
        ],
      },
      {
        code: "S1-06",
        level: "Undergraduate",
        author: "Ilva Khairunnisa",
        year: 2026,
        title: "Predicting the night-time physiological state of lettuce from light and dark period data in a plant factory",
        tags: ["Plant factory", "Plant physiology", "Machine learning"],
        summary:
          "Night-time stomatal conductance, rarely studied but a source of water loss, measured every ten minutes from 21:00 to 05:00 and modelled with ridge, random forest and XGBoost using daytime physiology as memory features, validated leave-one-day-out.",
        results: [
          { value: "0.979", label: "R² of the selected random forest model" },
          { value: "0.008", label: "spread of R² between plants" },
        ],
        points: [
          "Conductance stays measurable and fluctuates in full darkness; pre-dawn opening seen in two of three plants",
          "Leaf VPD and humidity are the main drivers; daytime features carry a memory effect",
        ],
      },
      {
        code: "S1-12",
        level: "Undergraduate",
        author: "Les' Aullian Achmad Argito",
        year: 2026,
        title: "Electrical impedance as a non-destructive indicator of lettuce stress from nutrients and water",
        tags: ["Plant factory", "Biosensing", "EIS"],
        summary:
          "Impedance spectra of hydroponic lettuce (AD5933, 1–101 kHz) under normal nutrients, nutrient deficiency and water stress, fitted with equivalent circuits and tested with mixed models, PERMANOVA and leakage-free classification against SPAD.",
        results: [
          { value: "0.943", label: "median R² of the best circuit, double Cole (MAPE 3.04%)" },
          { value: "21–41", label: "plants per treatment needed for significance, from power analysis" },
        ],
        points: [
          "Specific parameters respond to water stress (at 4 kHz) and to nutrient stress (at 1 kHz)",
          "Not yet significant with the current sample; a reference impedance dataset for tropical lettuce",
        ],
      },
      {
        code: "S2-03",
        level: "Master's",
        author: "Arifa Haryani",
        year: 2026,
        title: "Evaluating a plant physiology monitoring system based on visible to near-infrared spectroscopy in a controlled environment",
        tags: ["Controlled environment", "Low-cost spectroscopy"],
        summary:
          "A low-cost 14-band AS7265X sensor (410–760 nm) with ESP32, clock, microSD and the Agrarise dashboard, calibrated against a LI-COR LI-180 spectrometer and run for 14 days in a growth chamber on lettuce under normal and stressed nutrition.",
        results: [
          { value: "0.957–0.974", label: "R² of calibration against the reference spectrometer" },
          { value: "0.982–0.993", label: "R² in the two nutrient treatments" },
        ],
        points: [
          "Consistent reflectance features at 460 nm, 535–560 nm and 705–730 nm",
          "A low-cost sensor can stand in for an expensive spectrometer for continuous monitoring",
        ],
      },
      {
        code: "S2-01",
        level: "Master's",
        author: "Saifuddin Afif",
        member: "saifuddin-afif",
        year: 2025,
        title: "Plant health monitoring from electrical signals for indoor farming",
        tags: ["Plant factory", "Biosensing", "Electrophysiology"],
        summary:
          "Treats the plant's own electrical signal as a real-time, non-destructive physiological indicator. The acquisition device uses a Raspberry Pi Pico W, a 32-bit ADS1263 ADC, an INA129 instrumentation amplifier and filtering, tested on pak choi under changing light.",
        results: [
          { value: "32-bit", label: "resolution for microvolt-level plant signals" },
          { value: "0.955–0.9996", label: "R² of amplifier gain linearity across four gains" },
        ],
        points: [
          "The low-pass filter suppresses interference above 30 Hz from mains, wifi and radio",
          "Portable and low-cost compared with the 12–16 bit commercial DAQs used before",
        ],
      },
      {
        code: "S3-01",
        level: "Doctoral",
        author: "Saifuddin Afif",
        member: "saifuddin-afif",
        year: 2026,
        status: "Proposal",
        title: "Early detection of physiological deviation from plant electrical signals in controlled-environment agriculture",
        tags: ["CEA", "Biosensing", "Early detection"],
        summary:
          "Continues the master's work and proposes plant electrical signals as the primary reader of a crop's physiological state. Four 12-day cycles of lettuce at five nutrient strengths, with continuous electrical signals, hourly impedance and twice-daily hyperspectral imaging, against stomatal conductance, Fv/Fm, SPAD and biomass.",
        results: [
          { value: "4 × 12 days", label: "planned growing cycles" },
          { value: "5", label: "nutrient strengths, 0.4 to 3.2 mS/cm (1.6 optimal)" },
        ],
        points: [
          "Tests four claims: deviation, coherence, temporal priority and sufficiency of the signal",
          "Aims to show how early, and how well on its own, the signal flags trouble",
        ],
      },
    ],
  },

  // ------------------------------------------------------------ informatics
  "agro-informatics": {
    highlights: [
      { value: "87.8", label: "usability score (SUS, grade A+) of the rice traceability system" },
      { value: "100%", label: "of 82 test scenarios passed on the blockchain platform" },
      { value: "0.993", label: "R² of the PM2.5 sensor in the air quality early-warning system" },
    ],
    projects: [
      {
        title: "Smart coffee enterprise support system, Badung, Bali",
        summary:
          "A farmer-centred integrated database for a smallholder coffee cooperative, with a support-system pyramid from transactions to executive decisions, a cooperative dashboard and a knowledge-sharing architecture.",
        points: ["Activity traceable from farm to cooperative"],
        slides: [48],
      },
      {
        title: "Knowledge management system, Agrotechno Edu Park Sriharjo",
        summary:
          "Turns data into knowledge through a knowledge taxonomy and knowledge-gap measurement, piloted on irrigation modernisation.",
        points: ["Built with the community it serves"],
        slides: [49],
        partners: ["Yanmar", "Ministry of Public Works and Housing"],
      },
    ],
    studies: [
      {
        code: "S1-03",
        level: "Undergraduate",
        author: "Briliyan Hartanti",
        year: 2026,
        title: "An ERP-based management system for the plant factory",
        tags: ["Plant factory", "ERP", "Decision support"],
        summary:
          "Plant factory records were scattered across notes, spreadsheets and chat. A Google Sheets and Apps Script ERP with a central database links eight modules: activity, orders, customers, visits, visitors, human resources, financial summary and dashboard.",
        results: [
          { value: "100%", label: "black-box test pass rate across all eight modules" },
          { value: "8", label: "integrated modules" },
        ],
        points: ["Next: sensor integration through APIs and harvest forecasting"],
      },
      {
        code: "S1-14",
        level: "Undergraduate",
        author: "Zhorif Maulana Wirawan",
        year: 2026,
        title: "Blockchain traceability for the rice supply chain with Hyperledger Fabric",
        tags: ["Supply chain", "Blockchain"],
        summary:
          "The Ambapari system records transactions of seven supply-chain actors, from farmer to consumer, on a permissioned Hyperledger Fabric network. A smart contract checks SNI 6128:2020 rice quality at the mill, and batches are traced by ID and QR code.",
        results: [
          { value: "87.8", label: "System Usability Scale score, best imaginable (A+)" },
          { value: "82 / 82", label: "black-box test scenarios passed" },
        ],
        points: ["Delivers the roadmap's 2027 goal of blockchain traceability for agriculture"],
      },
      {
        code: "S1-11",
        level: "Undergraduate",
        author: "Zakha Wardana Saputra",
        year: 2026,
        title: "An IoT air quality early-warning system for the tofu industry of Sambak village, Magelang",
        tags: ["Environmental monitoring", "IoT", "Community"],
        summary:
          "Supports the village's climate programme with industrial-grade sensors (PM2.5, PM10, CO, SO2, NO2, O3, temperature, humidity), ESP32, an HMI, a cloud database, the smartagri real-time dashboard and a three-colour warning light, run for seven days in March 2026.",
        results: [
          { value: "0.993", label: "R² of the PM2.5 sensor against a reference instrument" },
          { value: "141.8", label: "average PM2.5 air quality index, unhealthy" },
        ],
        points: [
          "Pollution tracks boiler firing and tofu cooking",
          "An early-warning tool and a workplace health and safety measure for workers",
        ],
      },
    ],
  },
};

export function evidenceFor(slug: string): AreaEvidence {
  return RESEARCH_EVIDENCE[slug] ?? { highlights: [], projects: [], studies: [] };
}

// The center's roadmap, 2012 to 2030, from the profile deck (slide 5).
export const ROADMAP: {
  years: string;
  title: string;
  items: string[];
  phase: "past" | "now" | "future";
}[] = [
  {
    years: "2012–2024",
    title: "Foundation of smart agriculture systems",
    items: ["IoT in smart agriculture", "VPD monitoring for plant growth", "Edge computing analytics"],
    phase: "past",
  },
  {
    years: "2025",
    title: "Optimisation of control and automation",
    items: ["Smart grow-light systems", "CFD-based indoor farming", "Machine-learning plant growth models"],
    phase: "past",
  },
  {
    years: "2026",
    title: "Robotics and advanced sensing",
    items: ["AI-powered robotics", "Biosensing engineering", "Precision plantation management"],
    phase: "now",
  },
  {
    years: "2027",
    title: "AI and big data for decision support",
    items: ["AI-powered decision support", "Blockchain traceability for agriculture", "Big data analytics"],
    phase: "now",
  },
  {
    years: "2028",
    title: "Autonomous, self-optimising systems",
    items: ["AI-driven food production", "Self-adaptive irrigation networks", "AI-based pest and disease control"],
    phase: "future",
  },
  {
    years: "2029–2030",
    title: "Full-scale smart agriculture ecosystems",
    items: ["Fully automated smart farming", "Climate-resilient farming with AI", "AI-driven yield prediction"],
    phase: "future",
  },
];

export const EVIDENCE_TOTALS = (() => {
  const all = Object.values(RESEARCH_EVIDENCE);
  const studies = all.flatMap((a) => a.studies);
  return {
    projects: all.reduce((n, a) => n + a.projects.length, 0),
    studies: studies.length,
    undergraduate: studies.filter((s) => s.level === "Undergraduate").length,
    masters: studies.filter((s) => s.level === "Master's").length,
    doctoral: studies.filter((s) => s.level === "Doctoral").length,
  };
})();
