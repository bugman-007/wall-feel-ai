'use client'

export type SupportedLocaleCode =
  | 'en-US'
  | 'en-GB'
  | 'en-CA'
  | 'fr-FR'
  | 'fr-CA'
  | 'de-DE'
  | 'it-IT'
  | 'es-ES'
  | 'pl-PL'
  | 'ru-RU'
  | 'pt-PT'
  | 'pt-BR'

export type SupportedCurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'PLN'
  | 'RUB'
  | 'BRL'
  | 'CHF'
  | 'CZK'
  | 'DKK'
  | 'SEK'
  | 'NOK'

export type SupportedLanguageCode = 'en' | 'fr' | 'de' | 'it' | 'es' | 'pl' | 'ru' | 'pt'

export interface LocaleConfig {
  code: SupportedLocaleCode
  languageCode: SupportedLanguageCode
  label: string
  nativeLabel: string
  promptLabel: string
  defaultCurrency: SupportedCurrencyCode
}

export interface CurrencyConfig {
  code: SupportedCurrencyCode
  label: string
  symbol: string
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<U>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

export const DEFAULT_LOCALE: SupportedLocaleCode = 'en-US'
export const DEFAULT_CURRENCY: SupportedCurrencyCode = 'USD'

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    code: 'en-US',
    languageCode: 'en',
    label: 'English (US)',
    nativeLabel: 'English (US)',
    promptLabel: 'English',
    defaultCurrency: 'USD',
  },
  {
    code: 'en-GB',
    languageCode: 'en',
    label: 'English (UK)',
    nativeLabel: 'English (UK)',
    promptLabel: 'English',
    defaultCurrency: 'GBP',
  },
  {
    code: 'en-CA',
    languageCode: 'en',
    label: 'English (Canada)',
    nativeLabel: 'English (Canada)',
    promptLabel: 'English',
    defaultCurrency: 'CAD',
  },
  {
    code: 'fr-FR',
    languageCode: 'fr',
    label: 'French (France)',
    nativeLabel: 'Francais (France)',
    promptLabel: 'Francais',
    defaultCurrency: 'EUR',
  },
  {
    code: 'fr-CA',
    languageCode: 'fr',
    label: 'French (Canada)',
    nativeLabel: 'Francais (Canada)',
    promptLabel: 'Francais',
    defaultCurrency: 'CAD',
  },
  {
    code: 'de-DE',
    languageCode: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    promptLabel: 'Deutsch',
    defaultCurrency: 'EUR',
  },
  {
    code: 'it-IT',
    languageCode: 'it',
    label: 'Italian',
    nativeLabel: 'Italiano',
    promptLabel: 'Italiano',
    defaultCurrency: 'EUR',
  },
  {
    code: 'es-ES',
    languageCode: 'es',
    label: 'Spanish',
    nativeLabel: 'Espanol',
    promptLabel: 'Espanol',
    defaultCurrency: 'EUR',
  },
  {
    code: 'pl-PL',
    languageCode: 'pl',
    label: 'Polish',
    nativeLabel: 'Polski',
    promptLabel: 'Polski',
    defaultCurrency: 'PLN',
  },
  {
    code: 'ru-RU',
    languageCode: 'ru',
    label: 'Russian',
    nativeLabel: 'Russkiy',
    promptLabel: 'Russkiy',
    defaultCurrency: 'RUB',
  },
  {
    code: 'pt-PT',
    languageCode: 'pt',
    label: 'Portuguese (Portugal)',
    nativeLabel: 'Portugues (Portugal)',
    promptLabel: 'Portugues',
    defaultCurrency: 'EUR',
  },
  {
    code: 'pt-BR',
    languageCode: 'pt',
    label: 'Portuguese (Brazil)',
    nativeLabel: 'Portugues (Brasil)',
    promptLabel: 'Portugues',
    defaultCurrency: 'BRL',
  },
]

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', label: 'USD', symbol: '$' },
  { code: 'EUR', label: 'EUR', symbol: '€' },
  { code: 'GBP', label: 'GBP', symbol: '£' },
  { code: 'CAD', label: 'CAD', symbol: 'C$' },
  { code: 'PLN', label: 'PLN', symbol: 'zł' },
  { code: 'RUB', label: 'RUB', symbol: '₽' },
  { code: 'BRL', label: 'BRL', symbol: 'R$' },
  { code: 'CHF', label: 'CHF', symbol: 'CHF' },
  { code: 'CZK', label: 'CZK', symbol: 'Kč' },
  { code: 'DKK', label: 'DKK', symbol: 'kr' },
  { code: 'SEK', label: 'SEK', symbol: 'kr' },
  { code: 'NOK', label: 'NOK', symbol: 'kr' },
]

const USD_TO_CURRENCY_RATES: Record<SupportedCurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  PLN: 3.95,
  RUB: 92,
  BRL: 5.08,
  CHF: 0.9,
  CZK: 23.2,
  DKK: 6.86,
  SEK: 10.44,
  NOK: 10.73,
}

const EN_MESSAGES = {
  common: {
    filtersOne: 'Filter',
    filtersOther: 'Filters',
    meters: 'meters',
    feet: 'feet',
    inches: 'inches',
    remove: 'Remove',
    tryAgain: 'Try Again',
    page: 'Page',
    of: 'of',
  },
  selectors: {
    language: 'Language',
    currency: 'Currency',
    promptTitle: 'Use your local language and currency?',
    promptBody: 'We noticed your browser is set to {language}. Switch most of the experience to {language} with {currency}, or keep English with USD.',
    useLocal: 'Use {language} + {currency}',
    keepEnglish: 'Keep English + USD',
    changeLater: 'You can change language and currency anytime from the controls at the top right.',
  },
  hero: {
    title: 'Transform Your Walls Into Luxury Experiences',
    subtitle: 'AI-powered wall design. Upload. Visualize. Experience.',
    startDesigning: 'Start Designing',
  },
  features: {
    title: 'Our Key Features',
    items: [
      {
        title: 'AI Upload & Preview',
        description: 'Upload room photos and instantly map premium wallpaper concepts.',
      },
      {
        title: 'Smart Material Selection',
        description: 'Compare peel-and-stick, classic, and premium finishes in real time.',
      },
      {
        title: '3D Immersive Visualization',
        description: 'See perspective-aware previews before committing to installation.',
      },
      {
        title: 'Custom Design Request',
        description: 'Work with our team to create tailored textures for unique spaces.',
      },
    ],
  },
  process: {
    title: 'How It Works',
    items: [
      { title: 'Upload Your Space' },
      { title: 'Choose Style & Material' },
      { title: 'AI Generates Preview' },
      { title: 'Order Your Design' },
    ],
  },
  visualizer: {
    title: 'Visualize Your Space',
    subtitle: 'Upload your room photo and refine a premium wall concept with a calmer, more editorial design review flow.',
    uploadStep: '1. Upload Your Room Photo',
    tabs: {
      browse: 'Browse Catalog',
      create: 'Create Your Own',
    },
    chooseCatalog: '2. Browse by Category',
    chooseStyleFeel: '2. Choose Style & Feel',
    chooseWallpaper: '3. Choose Your Wallpaper Design',
    chooseWallpaperFiltered: '3. Choose from {count} {filterWord}',
    generatePreview: '4. Generate Preview',
    generatePreviewIntro: 'AI will automatically detect walls and apply the wallpaper.',
    generatePreviewResolution: 'Final previews are generated automatically in 1K for the fastest review flow.',
    generatePreviewButton: 'Generate Preview with AI',
    createStep: '2. Create Your Custom Wallpaper',
    generationFailed: 'Preview Generation Failed',
    previewTitle: 'Your Preview',
  },
  upload: {
    stagePrompt: 'Upload Your Vision. We Design Luxury Around It.',
    stageReady: 'Your room is ready for luxury design review.',
    dropHere: 'Drop your image here',
    dragAndDrop: 'Drag & Drop or Click to Upload',
    filesHint: 'JPG, PNG up to 10MB',
    guidance: 'Capture the full wall with good lighting for the most realistic preview.',
    captureTitle: 'Capture Room Photo',
    captureCopy: 'Use your camera to create a clean front-facing room image without leaving the flow.',
    bestResultsTitle: 'How to Get the Best Result',
    bestResults: [
      'Use a high-resolution room photo',
      'Capture the full wall perspective',
      'Avoid glare and harsh backlight',
      'Keep the camera steady and level',
    ],
    openCamera: 'Open Camera',
    uploading: 'Uploading...',
    uploadTooLarge: 'File is too large. Maximum size is 10MB.',
    uploadInvalidType: 'Invalid file type. Please upload a JPEG or PNG image.',
    uploadFailed: 'Failed to upload image. Please try again.',
  },
  filter: {
    parentLabel: 'Choose a category',
    childLabel: 'Choose a collection',
    chooseStyle: 'Choose Your Style',
    chooseFeel: 'How should it feel?',
    clearSelection: 'Clear selection - Show all designs',
    clearAll: 'Clear all filters - Show all designs',
    failedToLoad: 'Failed to load catalog categories.',
  },
  wallpaperGrid: {
    failedToLoad: 'Failed to load wallpaper designs. Please try again.',
    noDesigns: 'No wallpaper designs available.',
    previous: 'Previous',
    next: 'Next',
    tryAgain: 'Try again',
  },
  create: {
    describeLabel: 'Describe your dream wallpaper',
    promptPlaceholder: 'Luxurious warm and elegant wallpaper with subtle texture...',
    promptPlaceholderWithReference: 'Example: keep the wedding elements, but change the background into a soft natural botanical scene...',
    promptHint: 'Your prompt will transform the uploaded design below and create three edited wallpaper options.',
    styleInspiration: 'Style inspiration (optional)',
    styleOptions: [
      'Tropical Paradise',
      'Warm Minimal Texture',
      'Luxury Marble Pattern',
      'Organic Botanical',
    ],
    uploadTitle: 'Upload Your Own Wallpaper Design',
    uploadCopy: 'Upload your artwork as a base design, then use the prompt above to request edits and generate three refined wallpaper options.',
    uploadingButton: 'Uploading Design...',
    replaceButton: 'Replace Uploaded Design',
    uploadButton: 'Upload Wallpaper Design',
    uploadNote: 'JPG or PNG, up to 10MB',
    uploadInvalidType: 'Please upload a JPG or PNG wallpaper design.',
    uploadTooLarge: 'Your design is too large. Please keep it under 10MB.',
    uploadFailed: 'Failed to upload your wallpaper design.',
    referenceKicker: 'Uploaded Design Reference',
    referenceCopy: 'Keep this as your source artwork and use the prompt to request changes like background swaps, softer palettes, or more natural motifs.',
    useAsIs: 'Use Uploaded Design As-Is',
    removeDesign: 'Remove Design',
    generateUploaded: 'Generate 3 Variants From Uploaded Design',
    generateGeneric: 'Generate 3 Wallpaper Options',
    reviewTitleMultiple: 'Choose Your Wallpaper Option',
    reviewTitleSingle: 'Review Your Wallpaper Design',
    reviewCopyEdited: 'We created three refined variations from your uploaded design. Pick the version that best fits your room before mapping it.',
    reviewCopyGenerated: 'We created three wallpaper directions for you. Pick the one that best fits your room before mapping it.',
    reviewCopySingle: 'Your uploaded wallpaper is ready. Confirm it below, then map it onto your room.',
    selectedForPreview: 'Selected for room preview',
    clickToChoose: 'Click to choose this design',
    applySelected: 'Apply Selected Design',
    chooseAnother: 'Choose Another Design',
    tryDifferent: 'Try a different design',
    editedOptionLabel: 'Edited Option {index}',
    optionLabel: 'Option {index}',
    editedOptionHelpers: [
      'Closest to your uploaded design',
      'Refined variation with softer edits',
      'More expressive reinterpretation',
    ],
    generatedOptionHelpers: [
      'Balanced luxury direction',
      'Calmer and softer variation',
      'Bolder statement variation',
    ],
  },
  progress: {
    queuedTitle: 'Waiting for an available AI studio slot...',
    queuedDetail: 'Your request is in line and will begin automatically as soon as a generation slot opens.',
    wallpaper: [
      {
        title: 'Curating your wallpaper directions...',
        detail: 'Shaping motif, rhythm, and finish into three distinct luxury concepts.',
      },
      {
        title: 'Balancing texture and composition...',
        detail: 'Refining the visual language so each option feels elevated and coherent.',
      },
      {
        title: 'Polishing your collection...',
        detail: 'Preparing the final trio so you can compare subtle and bold variations.',
      },
    ],
    preview: [
      {
        title: 'Reading your room geometry...',
        detail: 'Understanding wall edges, perspective, and architectural depth.',
      },
      {
        title: 'Mapping the wallpaper with care...',
        detail: 'Blending the surface into lighting, corners, and room structure.',
      },
      {
        title: 'Finalizing the visual preview...',
        detail: 'Smoothing edges and contrast so the room feels believable and elegant.',
      },
    ],
    mapping: [
      {
        title: 'Applying your selected design...',
        detail: 'Projecting the chosen wallpaper onto the room with matched perspective.',
      },
      {
        title: 'Blending light and wall depth...',
        detail: 'Matching shadows, tone, and edge transitions for a realistic result.',
      },
      {
        title: 'Rendering the final room scene...',
        detail: 'Preparing a polished preview for review, sharing, and material selection.',
      },
    ],
  },
  preview: {
    after: 'After',
    before: 'Before',
    instructionTitle: 'Drag the slider to compare before and after',
    instructionDetail: 'Move the slider left and right to see how the wallpaper looks on your wall.',
    tryDifferent: 'Try Different Wallpaper',
    downloadPreview: 'Download Preview',
    downloading: 'Downloading...',
  },
  share: {
    title: 'Share Your Design',
    copied: 'Copied!',
    copyLink: 'Copy Link',
    whatsapp: 'WhatsApp',
    email: 'Email',
    share: 'Share',
    download: 'Download',
    whatsappText: 'Check out my WallFeel room preview: {url}',
    emailSubject: 'My WallFeel Room Preview',
    emailBody: 'Check out my WallFeel room preview: {url}',
    nativeTitle: 'My WallFeel Room Preview',
    nativeText: 'Check out my WallFeel room preview',
  },
  materials: {
    title: 'Smart Material Selection',
    subtitle: 'Explore our premium textured wall coverings, tailored for quality and style.',
    pricingKicker: 'Wall Dimensions',
    pricingTitle: 'Calculate your wall area and total estimate',
    measurementAria: 'Measurement unit',
    wallWidth: 'Wall width',
    wallHeight: 'Wall height',
    selectedMaterial: 'Selected material',
    wallArea: 'Wall area',
    totalPrice: 'Total price',
    chooseMaterial: 'Choose a material card above',
    enterMetric: 'Enter width and height in meters',
    enterImperial: 'Enter width and height in feet',
    enterInches: 'Enter width and height in inches',
    normalizedPricing: 'Pricing is normalized to square meters.',
    billableArea: '{value} sqm billable area',
    selectMaterialAndDimensions: 'Select material and dimensions',
    pricingUnlocks: 'Pricing unlocks after material selection.',
    addToCart: 'Add to Cart',
    footnote: 'Estimates are shown in {currency} and based on the selected wall area.',
    cartNotice: 'Cart integration coming soon. {material} is estimated at {price} for this wall.',
    unitMetric: 'm × m',
    unitImperial: 'ft × ft',
    unitInches: 'in × in',
    unitSqm: 'sqm',
    unitSqft: 'sqft',
    unitSqin: 'sqin',
    perSqm: 'per sqm',
    perSqft: 'per sqft',
    materialMap: {
      'easy-peel-stick': {
        name: 'Easy Peel & Stick',
        finishLabel: 'Easy Peel & Stick',
        features: [
          'PVC-Free Vinyl Material',
          'Waterproof Surface',
          'Smooth Matte Finish',
          'Removable & Scratch-resistant',
        ],
      },
      'premium-matte': {
        name: 'Premium Matte',
        finishLabel: 'Premium Matte',
        features: [
          'Lightweight Fabric Material',
          'Installed Using Wallpaper Paste',
          'Tear, Stain & Scratch-resistant',
          'Soft Premium Matte Finish',
        ],
      },
      'premium-textured-3d': {
        name: 'Premium Textured 3D',
        finishLabel: 'Premium 3D Textured',
        features: [
          'Heavy, Thick Fabric Material',
          'Installed Using Wallpaper Paste',
          'Easy Seamless Installation',
          'Deeply Textured Matte Finish',
        ],
      },
    },
  },
  cta: {
    title: 'Ready to Redefine Your Space?',
    start: 'Start Your Design',
    talk: 'Talk to a Designer',
  },
  footer: {
    about: 'About',
    services: 'Services',
    projects: 'Projects',
    contact: 'Contact',
  },
  camera: {
    title: 'Capture Room Photo',
    starting: 'Starting camera...',
    clickToStart: 'Click to start camera',
    tryAgain: 'Try Again',
    permissionDenied: 'Camera access denied. Please allow camera permissions in your browser settings.',
    noCamera: 'No camera found. Please connect a camera and try again.',
    busy: 'Camera is busy. Please close other apps using the camera.',
    httpsRequired: 'Camera access requires HTTPS. Please use a secure connection.',
    unavailable: 'Unable to access camera. Please make sure a camera is connected.',
    turnOffFlash: 'Turn off flash',
    turnOnFlash: 'Turn on flash',
    flipCamera: 'Flip camera',
    retake: 'Retake',
  },
}

type AppMessages = typeof EN_MESSAGES

const MESSAGE_OVERRIDES: Record<SupportedLanguageCode, DeepPartial<AppMessages>> = {
  en: {},
  fr: {
    selectors: {
      language: 'Langue',
      currency: 'Devise',
      promptTitle: 'Utiliser votre langue et votre devise locales ?',
      promptBody: 'Nous avons detecte {language} dans votre navigateur. Passez la majeure partie de l experience en {language} avec {currency}, ou gardez l anglais avec USD.',
      useLocal: 'Utiliser {language} + {currency}',
      keepEnglish: 'Garder l anglais + USD',
      changeLater: 'Vous pourrez changer la langue et la devise a tout moment depuis les controles en haut a droite.',
    },
    hero: {
      title: 'Transformez vos murs en experiences luxueuses',
      subtitle: 'Design mural par IA. Importez. Visualisez. Ressentez.',
      startDesigning: 'Commencer',
    },
    features: {
      title: 'Nos fonctionnalites cles',
      items: [
        {
          title: 'Import IA et apercu',
          description: 'Importez des photos de votre piece et projetez instantanement des concepts premium.',
        },
        {
          title: 'Selection intelligente des materiaux',
          description: 'Comparez les finitions repositionnables, classiques et premium en temps reel.',
        },
        {
          title: 'Visualisation immersive 3D',
          description: 'Visualisez des apercus sensibles a la perspective avant l installation.',
        },
        {
          title: 'Demande de design sur mesure',
          description: 'Travaillez avec notre equipe pour creer des textures adaptees aux espaces uniques.',
        },
      ],
    },
    process: {
      title: 'Comment cela fonctionne',
      items: [
        { title: 'Importez votre espace' },
        { title: 'Choisissez style et materiau' },
        { title: 'L IA genere l apercu' },
        { title: 'Commandez votre design' },
      ],
    },
    visualizer: {
      title: 'Visualisez votre espace',
      subtitle: 'Importez votre photo et affinez un concept mural premium dans un flux plus calme et editorial.',
      uploadStep: '1. Importez la photo de votre piece',
      tabs: {
        browse: 'Parcourir le catalogue',
        create: 'Creer le votre',
      },
      chooseStyleFeel: '2. Choisissez style et ambiance',
      chooseWallpaper: '3. Choisissez votre design mural',
      chooseWallpaperFiltered: '3. Choisissez parmi {count} {filterWord}',
      generatePreview: '4. Generer l apercu',
      generatePreviewIntro: 'L IA detectera automatiquement les murs et appliquera le papier peint.',
      generatePreviewResolution: 'Les apercus finaux sont generes automatiquement en 1K pour une revision rapide.',
      generatePreviewButton: 'Generer l apercu avec IA',
      createStep: '2. Creez votre papier peint personnalise',
      generationFailed: 'Echec de generation de l apercu',
      previewTitle: 'Votre apercu',
    },
    upload: {
      stagePrompt: 'Importez votre vision. Nous concevons le luxe autour d elle.',
      stageReady: 'Votre piece est prete pour une revue de design premium.',
      dropHere: 'Deposez votre image ici',
      dragAndDrop: 'Glissez-deposez ou cliquez pour importer',
      filesHint: 'JPG, PNG jusqu a 10 Mo',
      guidance: 'Cadrez le mur entier avec une bonne lumiere pour un rendu plus realiste.',
      captureTitle: 'Prendre une photo de la piece',
      captureCopy: 'Utilisez votre camera pour creer une image propre et frontale sans quitter le flux.',
      bestResultsTitle: 'Comment obtenir le meilleur resultat',
      bestResults: [
        'Utilisez une photo de piece en haute resolution',
        'Cadrez toute la perspective du mur',
        'Evitez les reflets et le contre-jour fort',
        'Gardez la camera stable et droite',
      ],
      openCamera: 'Ouvrir la camera',
      uploading: 'Import en cours...',
      uploadTooLarge: 'Le fichier est trop volumineux. Taille maximale : 10 Mo.',
      uploadInvalidType: 'Type de fichier invalide. Importez une image JPEG ou PNG.',
      uploadFailed: 'Echec de l import de l image. Veuillez reessayer.',
    },
    filter: {
      chooseStyle: 'Choisissez votre style',
      chooseFeel: 'Quelle ambiance souhaitez-vous ?',
      clearAll: 'Effacer tous les filtres - Afficher tous les designs',
      failedToLoad: 'Impossible de charger les filtres',
    },
    wallpaperGrid: {
      failedToLoad: 'Impossible de charger les designs muraux. Veuillez reessayer.',
      noDesigns: 'Aucun design mural disponible.',
      previous: 'Precedent',
      next: 'Suivant',
      tryAgain: 'Reessayer',
    },
    create: {
      describeLabel: 'Decrivez le papier peint de vos reves',
      promptPlaceholder: 'Papier peint luxueux, chaleureux et elegant avec une texture subtile...',
      promptPlaceholderWithReference: 'Exemple : conservez les elements du mariage, mais remplacez l arriere-plan par une scene botanique naturelle et douce...',
      promptHint: 'Votre prompt transformera le design importe ci-dessous et creera trois variantes modifiees.',
      styleInspiration: 'Inspiration de style (facultatif)',
      styleOptions: [
        'Paradis tropical',
        'Texture minimaliste chaleureuse',
        'Motif marbre luxueux',
        'Botanique organique',
      ],
      uploadTitle: 'Importer votre propre design mural',
      uploadCopy: 'Importez votre creation comme base, puis utilisez le prompt ci-dessus pour demander des modifications et generer trois variantes raffinees.',
      uploadingButton: 'Import du design...',
      replaceButton: 'Remplacer le design importe',
      uploadButton: 'Importer un design mural',
      uploadNote: 'JPG ou PNG, jusqu a 10 Mo',
      uploadInvalidType: 'Veuillez importer un design mural JPG ou PNG.',
      uploadTooLarge: 'Votre design est trop lourd. Merci de rester sous 10 Mo.',
      uploadFailed: 'Impossible d importer votre design mural.',
      referenceKicker: 'Reference du design importe',
      referenceCopy: 'Gardez cette image comme oeuvre source et utilisez le prompt pour demander des changements comme un nouveau fond, une palette plus douce ou des motifs plus naturels.',
      useAsIs: 'Utiliser le design importe tel quel',
      removeDesign: 'Supprimer le design',
      generateUploaded: 'Generer 3 variantes a partir du design importe',
      generateGeneric: 'Generer 3 options de papier peint',
      reviewTitleMultiple: 'Choisissez votre option de papier peint',
      reviewTitleSingle: 'Verifiez votre design mural',
      reviewCopyEdited: 'Nous avons cree trois variations raffinees a partir de votre design importe. Choisissez celle qui convient le mieux a votre piece.',
      reviewCopyGenerated: 'Nous avons cree trois directions murales pour vous. Choisissez celle qui convient le mieux a votre piece.',
      reviewCopySingle: 'Votre design importe est pret. Confirmez-le ci-dessous puis appliquez-le a votre piece.',
      selectedForPreview: 'Selectionne pour l apercu de la piece',
      clickToChoose: 'Cliquez pour choisir ce design',
      applySelected: 'Appliquer le design selectionne',
      chooseAnother: 'Choisir un autre design',
      tryDifferent: 'Essayer un autre design',
      editedOptionLabel: 'Option modifiee {index}',
      optionLabel: 'Option {index}',
      editedOptionHelpers: [
        'La plus proche de votre design importe',
        'Variation plus douce et raffinee',
        'Reinterpretation plus expressive',
      ],
      generatedOptionHelpers: [
        'Direction luxueuse equilibree',
        'Variation plus calme et plus douce',
        'Variation plus affirmée',
      ],
    },
    progress: {
      queuedTitle: 'En attente d un studio IA disponible...',
      queuedDetail: 'Votre demande est dans la file et demarrera automatiquement des qu un emplacement sera libre.',
      wallpaper: [
        {
          title: 'Selection de vos directions murales...',
          detail: 'Nous faconnons motif, rythme et finition en trois concepts luxueux.',
        },
        {
          title: 'Equilibrage de la texture et de la composition...',
          detail: 'Nous raffinons le langage visuel pour que chaque option reste elegante et coherente.',
        },
        {
          title: 'Finition de votre collection...',
          detail: 'Nous preparons le trio final pour comparer les variations subtiles et audacieuses.',
        },
      ],
      preview: [
        {
          title: 'Lecture de la geometrie de votre piece...',
          detail: 'Nous analysons les bords du mur, la perspective et la profondeur architecturale.',
        },
        {
          title: 'Application du papier peint avec soin...',
          detail: 'Nous integrons la surface a la lumiere, aux angles et a la structure de la piece.',
        },
        {
          title: 'Finalisation de l apercu...',
          detail: 'Nous lissons les bords et les contrastes pour un resultat credible et elegant.',
        },
      ],
      mapping: [
        {
          title: 'Application de votre design selectionne...',
          detail: 'Nous projetons le papier peint choisi sur la piece avec une perspective adaptee.',
        },
        {
          title: 'Fusion de la lumiere et de la profondeur...',
          detail: 'Nous ajustons les ombres, les tons et les transitions pour un resultat realiste.',
        },
        {
          title: 'Rendu de la scene finale...',
          detail: 'Nous preparons un apercu poli pour la revision, le partage et la selection du materiau.',
        },
      ],
    },
    preview: {
      after: 'Apres',
      before: 'Avant',
      instructionTitle: 'Faites glisser le curseur pour comparer avant et apres',
      instructionDetail: 'Deplacez le curseur a gauche et a droite pour voir le rendu du papier peint sur votre mur.',
      tryDifferent: 'Essayer un autre papier peint',
      downloadPreview: 'Telecharger l apercu',
      downloading: 'Telechargement...',
    },
    share: {
      title: 'Partagez votre design',
      copied: 'Copie !',
      copyLink: 'Copier le lien',
      email: 'E-mail',
      share: 'Partager',
      download: 'Telecharger',
      whatsappText: 'Decouvrez mon apercu de piece WallFeel : {url}',
      emailSubject: 'Mon apercu de piece WallFeel',
      emailBody: 'Decouvrez mon apercu de piece WallFeel : {url}',
      nativeTitle: 'Mon apercu de piece WallFeel',
      nativeText: 'Decouvrez mon apercu de piece WallFeel',
    },
    materials: {
      title: 'Selection intelligente des materiaux',
      subtitle: 'Explorez nos revetements muraux textures premium, adaptes a la qualite et au style.',
      pricingKicker: 'Dimensions du mur',
      pricingTitle: 'Calculez la surface du mur et votre estimation totale',
      measurementAria: 'Unite de mesure',
      wallWidth: 'Largeur du mur',
      wallHeight: 'Hauteur du mur',
      selectedMaterial: 'Materiau selectionne',
      wallArea: 'Surface du mur',
      totalPrice: 'Prix total',
      chooseMaterial: 'Choisissez une carte de materiau ci-dessus',
      enterMetric: 'Saisissez largeur et hauteur en metres',
      enterImperial: 'Saisissez largeur et hauteur en pieds',
      enterInches: 'Saisissez largeur et hauteur en pouces',
      normalizedPricing: 'Le tarif est normalise au metre carre.',
      billableArea: '{value} sqm de surface facturable',
      selectMaterialAndDimensions: 'Selectionnez materiau et dimensions',
      pricingUnlocks: 'Le prix s affichera apres la selection du materiau.',
      addToCart: 'Ajouter au panier',
      footnote: 'Les estimations sont affichees en {currency} et basees sur la surface selectionnee.',
      cartNotice: 'L integration du panier arrive bientot. {material} est estime a {price} pour ce mur.',
      perSqm: 'par sqm',
      perSqft: 'par sqft',
      materialMap: {
        'easy-peel-stick': {
          name: 'Easy Peel & Stick',
          finishLabel: 'Easy Peel & Stick',
          features: [
            'Vinyle sans PVC',
            'Surface impermeable',
            'Finition mate lisse',
            'Amovible et resistante aux rayures',
          ],
        },
        'premium-matte': {
          name: 'Premium Matte',
          finishLabel: 'Premium Matte',
          features: [
            'Materiau textile leger',
            'Pose avec colle a papier peint',
            'Resistance aux dechirures, taches et rayures',
            'Finition mate premium douce',
          ],
        },
        'premium-textured-3d': {
          name: 'Premium Textured 3D',
          finishLabel: 'Premium 3D Textured',
          features: [
            'Materiau textile epais et dense',
            'Pose avec colle a papier peint',
            'Installation facile et sans raccord visible',
            'Finition mate profondement texturee',
          ],
        },
      },
    },
    cta: {
      title: 'Pret a reimaginer votre espace ?',
      start: 'Commencer votre design',
      talk: 'Parler a un designer',
    },
    footer: {
      about: 'A propos',
      services: 'Services',
      projects: 'Projets',
      contact: 'Contact',
    },
    camera: {
      title: 'Prendre une photo de la piece',
      starting: 'Demarrage de la camera...',
      clickToStart: 'Cliquez pour demarrer la camera',
      tryAgain: 'Reessayer',
      permissionDenied: 'Acces camera refuse. Autorisez la camera dans les reglages de votre navigateur.',
      noCamera: 'Aucune camera detectee. Connectez une camera puis reessayez.',
      busy: 'La camera est deja utilisee. Fermez les autres applications qui l utilisent.',
      httpsRequired: 'L acces camera requiert HTTPS. Veuillez utiliser une connexion securisee.',
      unavailable: 'Impossible d acceder a la camera. Verifiez qu une camera est disponible.',
      turnOffFlash: 'Eteindre le flash',
      turnOnFlash: 'Allumer le flash',
      flipCamera: 'Changer de camera',
      retake: 'Reprendre',
    },
  },
  de: {
    selectors: {
      language: 'Sprache',
      currency: 'Wahrung',
      promptTitle: 'Lokale Sprache und Wahrung verwenden?',
      promptBody: 'Wir haben {language} in Ihrem Browser erkannt. Wechseln Sie den Grossteil der Seite auf {language} mit {currency}, oder bleiben Sie bei Englisch mit USD.',
      useLocal: '{language} + {currency} verwenden',
      keepEnglish: 'Englisch + USD behalten',
      changeLater: 'Sie konnen Sprache und Wahrung jederzeit oben rechts andern.',
    },
    hero: {
      title: 'Verwandeln Sie Ihre Wande in luxuriöse Erlebnisse',
      subtitle: 'KI-gestutztes Wanddesign. Hochladen. Visualisieren. Erleben.',
      startDesigning: 'Jetzt starten',
    },
    features: {
      title: 'Unsere Kernfunktionen',
      items: [
        {
          title: 'KI-Upload und Vorschau',
          description: 'Laden Sie Raumfotos hoch und platzieren Sie sofort hochwertige Tapetenkonzepte.',
        },
        {
          title: 'Intelligente Materialwahl',
          description: 'Vergleichen Sie Peel-and-Stick-, klassische und Premium-Oberflachen in Echtzeit.',
        },
        {
          title: 'Immersive 3D-Vorschau',
          description: 'Sehen Sie perspektivische Vorschauen, bevor Sie sich fur die Installation entscheiden.',
        },
        {
          title: 'Individuelle Designanfrage',
          description: 'Arbeiten Sie mit unserem Team an massgeschneiderten Texturen fur besondere Raume.',
        },
      ],
    },
    process: {
      title: 'So funktioniert es',
      items: [
        { title: 'Raum hochladen' },
        { title: 'Stil und Material wahlen' },
        { title: 'KI erzeugt die Vorschau' },
        { title: 'Design bestellen' },
      ],
    },
    visualizer: {
      title: 'Visualisieren Sie Ihren Raum',
      subtitle: 'Laden Sie Ihr Raumfoto hoch und verfeinern Sie ein hochwertiges Wandkonzept in einem ruhigeren, editoriellen Ablauf.',
      uploadStep: '1. Laden Sie Ihr Raumfoto hoch',
      tabs: {
        browse: 'Katalog durchsuchen',
        create: 'Eigenes erstellen',
      },
      chooseStyleFeel: '2. Stil und Wirkung wahlen',
      chooseWallpaper: '3. Wahlen Sie Ihr Tapetendesign',
      chooseWallpaperFiltered: '3. Wahlen Sie aus {count} {filterWord}',
      generatePreview: '4. Vorschau erzeugen',
      generatePreviewIntro: 'Die KI erkennt automatisch die Wande und legt die Tapete darauf.',
      generatePreviewResolution: 'Endgultige Vorschauen werden automatisch in 1K erzeugt, fur eine schnelle Prufung.',
      generatePreviewButton: 'Vorschau mit KI erzeugen',
      createStep: '2. Eigene Tapete erstellen',
      generationFailed: 'Vorschau konnte nicht erzeugt werden',
      previewTitle: 'Ihre Vorschau',
    },
    upload: {
      stagePrompt: 'Laden Sie Ihre Vision hoch. Wir gestalten Luxus darum herum.',
      stageReady: 'Ihr Raum ist bereit fur die luxuriöse Designprufung.',
      dropHere: 'Bild hier ablegen',
      dragAndDrop: 'Ziehen Sie Ihr Bild hierher oder klicken Sie zum Hochladen',
      filesHint: 'JPG, PNG bis 10 MB',
      guidance: 'Erfassen Sie die gesamte Wand bei gutem Licht fur die realistischste Vorschau.',
      captureTitle: 'Raumfoto aufnehmen',
      captureCopy: 'Nutzen Sie Ihre Kamera fur ein sauberes, frontales Raumfoto ohne den Ablauf zu verlassen.',
      bestResultsTitle: 'So erzielen Sie das beste Ergebnis',
      bestResults: [
        'Verwenden Sie ein hochauflosendes Raumfoto',
        'Erfassen Sie die gesamte Wandperspektive',
        'Vermeiden Sie Blendung und hartes Gegenlicht',
        'Halten Sie die Kamera ruhig und gerade',
      ],
      openCamera: 'Kamera offnen',
      uploading: 'Wird hochgeladen...',
    },
    filter: {
      chooseStyle: 'Wahlen Sie Ihren Stil',
      chooseFeel: 'Wie soll es wirken?',
      clearAll: 'Alle Filter loschen - Alle Designs anzeigen',
      failedToLoad: 'Filter konnten nicht geladen werden',
    },
    wallpaperGrid: {
      failedToLoad: 'Tapetendesigns konnten nicht geladen werden. Bitte versuchen Sie es erneut.',
      noDesigns: 'Keine Tapetendesigns verfugbar.',
      previous: 'Zuruck',
      next: 'Weiter',
      tryAgain: 'Erneut versuchen',
    },
    create: {
      describeLabel: 'Beschreiben Sie Ihre Wunsch-Tapete',
      promptPlaceholder: 'Luxuriose, warme und elegante Tapete mit subtiler Struktur...',
      promptPlaceholderWithReference: 'Beispiel: Behalte die Hochzeitselemente, aber verandere den Hintergrund in eine weiche naturliche Botanikszene...',
      promptHint: 'Ihr Prompt verandert das hochgeladene Design unten und erstellt drei bearbeitete Varianten.',
      styleInspiration: 'Stilinspiration (optional)',
      styleOptions: [
        'Tropisches Paradies',
        'Warme Minimalstruktur',
        'Luxus-Marmormuster',
        'Organische Botanik',
      ],
      uploadTitle: 'Eigenes Tapetendesign hochladen',
      uploadCopy: 'Laden Sie Ihr Artwork als Basis hoch und nutzen Sie den Prompt oben, um Anderungen anzufordern und drei veredelte Varianten zu erzeugen.',
      uploadingButton: 'Design wird hochgeladen...',
      replaceButton: 'Hochgeladenes Design ersetzen',
      uploadButton: 'Tapetendesign hochladen',
      uploadNote: 'JPG oder PNG, bis 10 MB',
      uploadInvalidType: 'Bitte laden Sie ein JPG- oder PNG-Tapetendesign hoch.',
      uploadTooLarge: 'Ihr Design ist zu gross. Bitte bleiben Sie unter 10 MB.',
      uploadFailed: 'Ihr Tapetendesign konnte nicht hochgeladen werden.',
      referenceKicker: 'Hochgeladene Designvorlage',
      referenceCopy: 'Behalten Sie dies als Ausgangsdesign und nutzen Sie den Prompt fur Anderungen wie Hintergrundwechsel, weichere Farben oder naturlichere Motive.',
      useAsIs: 'Hochgeladenes Design unverandert verwenden',
      removeDesign: 'Design entfernen',
      generateUploaded: '3 Varianten aus dem hochgeladenen Design erzeugen',
      generateGeneric: '3 Tapetenoptionen erzeugen',
      reviewTitleMultiple: 'Wahlen Sie Ihre Tapetenoption',
      reviewTitleSingle: 'Prufen Sie Ihr Tapetendesign',
      reviewCopyEdited: 'Wir haben drei veredelte Varianten aus Ihrem hochgeladenen Design erstellt. Wahlen Sie die passende Version fur Ihren Raum.',
      reviewCopyGenerated: 'Wir haben drei Tapetenrichtungen fur Sie erstellt. Wahlen Sie die passende Version fur Ihren Raum.',
      reviewCopySingle: 'Ihr hochgeladenes Design ist bereit. Bestatigen Sie es unten und mappen Sie es dann auf Ihren Raum.',
      selectedForPreview: 'Fur Raumvorschau ausgewahlt',
      clickToChoose: 'Klicken Sie, um dieses Design zu wahlen',
      applySelected: 'Ausgewahltes Design anwenden',
      chooseAnother: 'Anderes Design wahlen',
      tryDifferent: 'Anderes Design versuchen',
      editedOptionLabel: 'Bearbeitete Option {index}',
      optionLabel: 'Option {index}',
      editedOptionHelpers: [
        'Am nahesten an Ihrem hochgeladenen Design',
        'Verfeinerte Variante mit sanfteren Anderungen',
        'Ausdrucksstarkere Neuinterpretation',
      ],
      generatedOptionHelpers: [
        'Ausgewogene Luxus-Richtung',
        'Ruhigere und weichere Variante',
        'Starkere Statement-Variante',
      ],
    },
    preview: {
      after: 'Nachher',
      before: 'Vorher',
      instructionTitle: 'Ziehen Sie den Regler fur den Vorher-/Nachher-Vergleich',
      instructionDetail: 'Bewegen Sie den Regler nach links und rechts, um die Tapete auf Ihrer Wand zu sehen.',
      tryDifferent: 'Andere Tapete testen',
      downloadPreview: 'Vorschau herunterladen',
      downloading: 'Wird heruntergeladen...',
    },
    share: {
      title: 'Design teilen',
      copied: 'Kopiert!',
      copyLink: 'Link kopieren',
      email: 'E-Mail',
      share: 'Teilen',
      download: 'Download',
      whatsappText: 'Sehen Sie sich meine WallFeel-Raumvorschau an: {url}',
      emailSubject: 'Meine WallFeel-Raumvorschau',
      emailBody: 'Sehen Sie sich meine WallFeel-Raumvorschau an: {url}',
      nativeTitle: 'Meine WallFeel-Raumvorschau',
      nativeText: 'Sehen Sie sich meine WallFeel-Raumvorschau an',
    },
    materials: {
      title: 'Intelligente Materialauswahl',
      subtitle: 'Entdecken Sie unsere hochwertigen strukturierten Wandbelage fur Qualitat und Stil.',
      pricingKicker: 'Wandmasse',
      pricingTitle: 'Berechnen Sie Wandflache und Gesamtschatzung',
      measurementAria: 'Maßeinheit',
      wallWidth: 'Wandbreite',
      wallHeight: 'Wandhohe',
      selectedMaterial: 'Ausgewahltes Material',
      wallArea: 'Wandflache',
      totalPrice: 'Gesamtpreis',
      chooseMaterial: 'Wahlen Sie oben eine Materialkarte',
      enterMetric: 'Geben Sie Breite und Hohe in Metern ein',
      enterImperial: 'Geben Sie Breite und Hohe in Fuss ein',
      enterInches: 'Geben Sie Breite und Hohe in Zoll ein',
      normalizedPricing: 'Die Preisbasis ist auf Quadratmeter normiert.',
      billableArea: '{value} sqm berechenbare Flache',
      selectMaterialAndDimensions: 'Material und Masse auswahlen',
      pricingUnlocks: 'Die Preisangabe erscheint nach der Materialwahl.',
      addToCart: 'In den Warenkorb',
      footnote: 'Schatzungen werden in {currency} angezeigt und basieren auf der gewahlten Wandflache.',
      cartNotice: 'Warenkorb-Integration folgt in Kurze. {material} wird fur diese Wand auf {price} geschatzt.',
      perSqm: 'pro sqm',
      perSqft: 'pro sqft',
    },
    cta: {
      title: 'Bereit, Ihren Raum neu zu definieren?',
      start: 'Design starten',
      talk: 'Mit einem Designer sprechen',
    },
    footer: {
      about: 'Uber uns',
      services: 'Services',
      projects: 'Projekte',
      contact: 'Kontakt',
    },
    camera: {
      title: 'Raumfoto aufnehmen',
      starting: 'Kamera wird gestartet...',
      clickToStart: 'Klicken Sie, um die Kamera zu starten',
      tryAgain: 'Erneut versuchen',
      permissionDenied: 'Kamerazugriff verweigert. Bitte erlauben Sie den Zugriff in Ihren Browsereinstellungen.',
      noCamera: 'Keine Kamera gefunden. Bitte schliessen Sie eine Kamera an und versuchen Sie es erneut.',
      busy: 'Die Kamera ist belegt. Bitte schliessen Sie andere Apps, die die Kamera verwenden.',
      httpsRequired: 'Kamerazugriff erfordert HTTPS. Bitte verwenden Sie eine sichere Verbindung.',
      unavailable: 'Auf die Kamera konnte nicht zugegriffen werden. Bitte stellen Sie sicher, dass eine Kamera verbunden ist.',
      turnOffFlash: 'Blitz ausschalten',
      turnOnFlash: 'Blitz einschalten',
      flipCamera: 'Kamera wechseln',
      retake: 'Neu aufnehmen',
    },
  },
  it: {
    selectors: {
      language: 'Lingua',
      currency: 'Valuta',
      promptTitle: 'Usare lingua e valuta locali?',
      promptBody: 'Abbiamo rilevato {language} nel tuo browser. Passa gran parte dell esperienza a {language} con {currency}, oppure mantieni l inglese con USD.',
      useLocal: 'Usa {language} + {currency}',
      keepEnglish: 'Mantieni inglese + USD',
      changeLater: 'Potrai cambiare lingua e valuta in qualsiasi momento dai controlli in alto a destra.',
    },
    hero: {
      title: 'Trasforma le tue pareti in esperienze di lusso',
      subtitle: 'Design murale con IA. Carica. Visualizza. Vivi l esperienza.',
      startDesigning: 'Inizia ora',
    },
    features: {
      title: 'Funzionalita principali',
      items: [
        {
          title: 'Upload e anteprima IA',
          description: 'Carica foto della stanza e applica subito concetti di carta da parati premium.',
        },
        {
          title: 'Selezione intelligente dei materiali',
          description: 'Confronta finiture peel-and-stick, classiche e premium in tempo reale.',
        },
        {
          title: 'Visualizzazione immersiva 3D',
          description: 'Guarda anteprime prospettiche prima di procedere con l installazione.',
        },
        {
          title: 'Richiesta design su misura',
          description: 'Lavora con il nostro team per creare texture personalizzate per spazi unici.',
        },
      ],
    },
    process: {
      title: 'Come funziona',
      items: [
        { title: 'Carica il tuo spazio' },
        { title: 'Scegli stile e materiale' },
        { title: 'L IA genera l anteprima' },
        { title: 'Ordina il tuo design' },
      ],
    },
    visualizer: {
      title: 'Visualizza il tuo spazio',
      subtitle: 'Carica la foto della tua stanza e affina un concetto premium in un flusso piu calmo ed editoriale.',
      uploadStep: '1. Carica la foto della tua stanza',
      tabs: {
        browse: 'Esplora catalogo',
        create: 'Crea il tuo',
      },
      chooseStyleFeel: '2. Scegli stile e atmosfera',
      chooseWallpaper: '3. Scegli il tuo design',
      chooseWallpaperFiltered: '3. Scegli tra {count} {filterWord}',
      generatePreview: '4. Genera anteprima',
      generatePreviewIntro: 'L IA rilevera automaticamente le pareti e applichera la carta da parati.',
      generatePreviewResolution: 'Le anteprime finali vengono generate automaticamente in 1K per una revisione piu rapida.',
      generatePreviewButton: 'Genera anteprima con IA',
      createStep: '2. Crea la tua carta da parati personalizzata',
      generationFailed: 'Generazione anteprima non riuscita',
      previewTitle: 'La tua anteprima',
    },
    filter: {
      chooseStyle: 'Scegli il tuo stile',
      chooseFeel: 'Che atmosfera desideri?',
      clearAll: 'Cancella tutti i filtri - Mostra tutti i design',
      failedToLoad: 'Impossibile caricare i filtri',
    },
    wallpaperGrid: {
      failedToLoad: 'Impossibile caricare i design. Riprova.',
      noDesigns: 'Nessun design disponibile.',
      previous: 'Precedente',
      next: 'Successivo',
      tryAgain: 'Riprova',
    },
    create: {
      describeLabel: 'Descrivi la carta da parati dei tuoi sogni',
      promptPlaceholder: 'Carta da parati lussuosa, calda ed elegante con texture sottile...',
      promptPlaceholderWithReference: 'Esempio: mantieni gli elementi del matrimonio, ma cambia lo sfondo in una scena botanica naturale e morbida...',
      promptHint: 'Il tuo prompt trasformera il design caricato qui sotto e creera tre varianti modificate.',
      styleInspiration: 'Ispirazione di stile (opzionale)',
      uploadTitle: 'Carica il tuo design di carta da parati',
      uploadCopy: 'Carica la tua grafica come base e usa il prompt sopra per richiedere modifiche e generare tre varianti raffinate.',
      uploadingButton: 'Caricamento design...',
      replaceButton: 'Sostituisci design caricato',
      uploadButton: 'Carica design carta da parati',
      uploadNote: 'JPG o PNG, fino a 10 MB',
      useAsIs: 'Usa il design caricato cosi com e',
      removeDesign: 'Rimuovi design',
      generateUploaded: 'Genera 3 varianti dal design caricato',
      generateGeneric: 'Genera 3 opzioni di carta da parati',
      reviewTitleMultiple: 'Scegli la tua opzione',
      reviewTitleSingle: 'Rivedi il tuo design',
      reviewCopyEdited: 'Abbiamo creato tre varianti raffinate partendo dal design caricato. Scegli quella piu adatta alla tua stanza.',
      reviewCopyGenerated: 'Abbiamo creato tre direzioni di carta da parati. Scegli quella piu adatta alla tua stanza.',
      reviewCopySingle: 'Il design caricato e pronto. Confermalo qui sotto e applicalo alla stanza.',
      selectedForPreview: 'Selezionato per l anteprima',
      clickToChoose: 'Clicca per scegliere questo design',
      applySelected: 'Applica design selezionato',
      chooseAnother: 'Scegli un altro design',
      tryDifferent: 'Prova un altro design',
      editedOptionLabel: 'Opzione modificata {index}',
      optionLabel: 'Opzione {index}',
    },
    preview: {
      after: 'Dopo',
      before: 'Prima',
      instructionTitle: 'Trascina il cursore per confrontare prima e dopo',
      instructionDetail: 'Sposta il cursore a sinistra e a destra per vedere la resa sulla parete.',
      tryDifferent: 'Prova un altra carta da parati',
      downloadPreview: 'Scarica anteprima',
      downloading: 'Download in corso...',
    },
    share: {
      title: 'Condividi il tuo design',
      copied: 'Copiato!',
      copyLink: 'Copia link',
      email: 'Email',
      share: 'Condividi',
      download: 'Scarica',
      whatsappText: 'Guarda la mia anteprima stanza WallFeel: {url}',
      emailSubject: 'La mia anteprima stanza WallFeel',
      emailBody: 'Guarda la mia anteprima stanza WallFeel: {url}',
      nativeTitle: 'La mia anteprima stanza WallFeel',
      nativeText: 'Guarda la mia anteprima stanza WallFeel',
    },
    materials: {
      title: 'Selezione intelligente dei materiali',
      subtitle: 'Esplora i nostri rivestimenti murali premium, pensati per qualita e stile.',
      pricingKicker: 'Dimensioni parete',
      pricingTitle: 'Calcola l area della parete e la stima totale',
      measurementAria: 'Unita di misura',
      wallWidth: 'Larghezza parete',
      wallHeight: 'Altezza parete',
      selectedMaterial: 'Materiale selezionato',
      wallArea: 'Area parete',
      totalPrice: 'Prezzo totale',
      chooseMaterial: 'Scegli una scheda materiale qui sopra',
      enterMetric: 'Inserisci larghezza e altezza in metri',
      enterImperial: 'Inserisci larghezza e altezza in piedi',
      enterInches: 'Inserisci larghezza e altezza in pollici',
      normalizedPricing: 'Il prezzo e normalizzato al metro quadrato.',
      billableArea: '{value} sqm di area fatturabile',
      selectMaterialAndDimensions: 'Seleziona materiale e dimensioni',
      pricingUnlocks: 'Il prezzo apparira dopo la selezione del materiale.',
      addToCart: 'Aggiungi al carrello',
      footnote: 'Le stime sono mostrate in {currency} e si basano sull area selezionata.',
      cartNotice: 'L integrazione del carrello arrivera presto. {material} e stimato a {price} per questa parete.',
      perSqm: 'per sqm',
      perSqft: 'per sqft',
    },
    cta: {
      title: 'Pronto a ridefinire il tuo spazio?',
      start: 'Inizia il tuo design',
      talk: 'Parla con un designer',
    },
    footer: {
      about: 'Chi siamo',
      services: 'Servizi',
      projects: 'Progetti',
      contact: 'Contatti',
    },
    camera: {
      title: 'Scatta una foto della stanza',
      starting: 'Avvio fotocamera...',
      clickToStart: 'Clicca per avviare la fotocamera',
      tryAgain: 'Riprova',
      permissionDenied: 'Accesso alla fotocamera negato. Consenti i permessi nel browser.',
      noCamera: 'Nessuna fotocamera trovata. Collega una fotocamera e riprova.',
      busy: 'La fotocamera e occupata. Chiudi le altre app che la stanno usando.',
      httpsRequired: 'L accesso alla fotocamera richiede HTTPS. Usa una connessione sicura.',
      unavailable: 'Impossibile accedere alla fotocamera. Assicurati che una fotocamera sia disponibile.',
      turnOffFlash: 'Disattiva flash',
      turnOnFlash: 'Attiva flash',
      flipCamera: 'Cambia fotocamera',
      retake: 'Riscatta',
    },
  },
  es: {
    selectors: {
      language: 'Idioma',
      currency: 'Moneda',
      promptTitle: 'Usar idioma y moneda locales?',
      promptBody: 'Hemos detectado {language} en tu navegador. Cambia la mayor parte de la experiencia a {language} con {currency}, o manten ingles con USD.',
      useLocal: 'Usar {language} + {currency}',
      keepEnglish: 'Mantener ingles + USD',
      changeLater: 'Podras cambiar idioma y moneda en cualquier momento desde los controles superiores.',
    },
    hero: {
      title: 'Transforma tus paredes en experiencias de lujo',
      subtitle: 'Diseno mural con IA. Sube. Visualiza. Experimenta.',
      startDesigning: 'Empezar',
    },
    features: {
      title: 'Nuestras funciones clave',
      items: [
        {
          title: 'Carga y vista previa con IA',
          description: 'Sube fotos de tu espacio y aplica al instante conceptos de papel mural premium.',
        },
        {
          title: 'Seleccion inteligente de materiales',
          description: 'Compara acabados peel-and-stick, clasicos y premium en tiempo real.',
        },
        {
          title: 'Visualizacion inmersiva 3D',
          description: 'Mira vistas previas con perspectiva antes de decidir la instalacion.',
        },
        {
          title: 'Solicitud de diseno personalizado',
          description: 'Trabaja con nuestro equipo para crear texturas adaptadas a espacios unicos.',
        },
      ],
    },
    process: {
      title: 'Como funciona',
      items: [
        { title: 'Sube tu espacio' },
        { title: 'Elige estilo y material' },
        { title: 'La IA genera la vista previa' },
        { title: 'Pide tu diseno' },
      ],
    },
    visualizer: {
      title: 'Visualiza tu espacio',
      subtitle: 'Sube la foto de tu estancia y ajusta un concepto mural premium en un flujo mas calmado y editorial.',
      uploadStep: '1. Sube la foto de tu estancia',
      tabs: {
        browse: 'Explorar catalogo',
        create: 'Crear el tuyo',
      },
      chooseStyleFeel: '2. Elige estilo y sensacion',
      chooseWallpaper: '3. Elige tu diseno mural',
      chooseWallpaperFiltered: '3. Elige entre {count} {filterWord}',
      generatePreview: '4. Generar vista previa',
      generatePreviewIntro: 'La IA detectara automaticamente las paredes y aplicara el papel mural.',
      generatePreviewResolution: 'Las vistas previas finales se generan automaticamente en 1K para una revision mas rapida.',
      generatePreviewButton: 'Generar vista previa con IA',
      createStep: '2. Crea tu papel mural personalizado',
      generationFailed: 'No se pudo generar la vista previa',
      previewTitle: 'Tu vista previa',
    },
    filter: {
      chooseStyle: 'Elige tu estilo',
      chooseFeel: 'Que sensacion deseas?',
      clearAll: 'Borrar todos los filtros - Mostrar todos los disenos',
      failedToLoad: 'No se pudieron cargar los filtros',
    },
    wallpaperGrid: {
      failedToLoad: 'No se pudieron cargar los disenos. Intentalo de nuevo.',
      noDesigns: 'No hay disenos disponibles.',
      previous: 'Anterior',
      next: 'Siguiente',
      tryAgain: 'Intentar de nuevo',
    },
    preview: {
      after: 'Despues',
      before: 'Antes',
      instructionTitle: 'Arrastra el control para comparar antes y despues',
      instructionDetail: 'Mueve el control a izquierda y derecha para ver como queda el papel mural en tu pared.',
      tryDifferent: 'Probar otro papel mural',
      downloadPreview: 'Descargar vista previa',
      downloading: 'Descargando...',
    },
    share: {
      title: 'Comparte tu diseno',
      copied: 'Copiado!',
      copyLink: 'Copiar enlace',
      email: 'Correo',
      share: 'Compartir',
      download: 'Descargar',
      whatsappText: 'Mira mi vista previa de WallFeel: {url}',
      emailSubject: 'Mi vista previa de WallFeel',
      emailBody: 'Mira mi vista previa de WallFeel: {url}',
      nativeTitle: 'Mi vista previa de WallFeel',
      nativeText: 'Mira mi vista previa de WallFeel',
    },
    materials: {
      title: 'Seleccion inteligente de materiales',
      subtitle: 'Explora nuestros revestimientos murales premium, pensados para calidad y estilo.',
      pricingKicker: 'Dimensiones de la pared',
      pricingTitle: 'Calcula el area de la pared y la estimacion total',
      measurementAria: 'Unidad de medida',
      wallWidth: 'Ancho de la pared',
      wallHeight: 'Alto de la pared',
      selectedMaterial: 'Material seleccionado',
      wallArea: 'Area de la pared',
      totalPrice: 'Precio total',
      chooseMaterial: 'Elige una tarjeta de material arriba',
      enterMetric: 'Introduce ancho y alto en metros',
      enterImperial: 'Introduce ancho y alto en pies',
      enterInches: 'Introduce ancho y alto en pulgadas',
      normalizedPricing: 'El precio se normaliza a metros cuadrados.',
      billableArea: '{value} sqm de area facturable',
      selectMaterialAndDimensions: 'Selecciona material y dimensiones',
      pricingUnlocks: 'El precio aparecera despues de seleccionar el material.',
      addToCart: 'Anadir al carrito',
      footnote: 'Las estimaciones se muestran en {currency} y se basan en el area seleccionada.',
      cartNotice: 'La integracion del carrito llegara pronto. {material} se estima en {price} para esta pared.',
      perSqm: 'por sqm',
      perSqft: 'por sqft',
    },
    cta: {
      title: 'Listo para redefinir tu espacio?',
      start: 'Comienza tu diseno',
      talk: 'Hablar con un dissenador',
    },
    footer: {
      about: 'Acerca de',
      services: 'Servicios',
      projects: 'Proyectos',
      contact: 'Contacto',
    },
  },
  pl: {
    selectors: {
      language: 'Jezyk',
      currency: 'Waluta',
      promptTitle: 'Uzyc lokalnego jezyka i waluty?',
      promptBody: 'Wykrylismy {language} w Twojej przegladarce. Przelaczyc wiekszosc strony na {language} z {currency}, czy zostawic angielski i USD?',
      useLocal: 'Uzyj {language} + {currency}',
      keepEnglish: 'Zostaw angielski + USD',
      changeLater: 'Jezyk i walute mozna zmienic pozniej w prawym gornym rogu.',
    },
    hero: {
      title: 'Zmien swoje sciany w luksusowe doswiadczenia',
      subtitle: 'Projekt scien z AI. Wgraj. Zobacz. Poczuj efekt.',
      startDesigning: 'Zacznij projekt',
    },
    features: {
      title: 'Kluczowe funkcje',
      items: [
        {
          title: 'AI upload i podglad',
          description: 'Wgraj zdjecia pomieszczenia i natychmiast dopasuj premium koncepcje tapet.',
        },
        {
          title: 'Inteligentny wybor materialu',
          description: 'Porownuj wykonczenia peel-and-stick, klasyczne i premium w czasie rzeczywistym.',
        },
        {
          title: 'Immersyjna wizualizacja 3D',
          description: 'Zobacz podglad perspektywiczny przed decyzja o instalacji.',
        },
        {
          title: 'Indywidualne zamowienie projektu',
          description: 'Wspolpracuj z naszym zespolem, aby stworzyc tekstury dla unikalnych przestrzeni.',
        },
      ],
    },
    process: {
      title: 'Jak to dziala',
      items: [
        { title: 'Wgraj swoje wnetrze' },
        { title: 'Wybierz styl i material' },
        { title: 'AI generuje podglad' },
        { title: 'Zamow projekt' },
      ],
    },
    visualizer: {
      title: 'Zwizualizuj swoja przestrzen',
      subtitle: 'Wgraj zdjecie pokoju i dopracuj premium koncepcje sciany w spokojniejszym, bardziej editorialowym przeplywie.',
      uploadStep: '1. Wgraj zdjecie pokoju',
      tabs: {
        browse: 'Przegladaj katalog',
        create: 'Stworz wlasny',
      },
      chooseStyleFeel: '2. Wybierz styl i klimat',
      chooseWallpaper: '3. Wybierz projekt tapety',
      chooseWallpaperFiltered: '3. Wybierz z {count} {filterWord}',
      generatePreview: '4. Generuj podglad',
      generatePreviewIntro: 'AI automatycznie wykryje sciany i nalozy tapete.',
      generatePreviewResolution: 'Finalne podglady sa generowane automatycznie w 1K dla szybszego przegladu.',
      generatePreviewButton: 'Generuj podglad z AI',
      createStep: '2. Stworz wlasna tapete',
      generationFailed: 'Nie udalo sie wygenerowac podgladu',
      previewTitle: 'Twoj podglad',
    },
    materials: {
      title: 'Inteligentny wybor materialu',
      subtitle: 'Poznaj nasze premium okladzinowe materialy scienne dopasowane do jakosci i stylu.',
      pricingKicker: 'Wymiary sciany',
      pricingTitle: 'Oblicz powierzchnie sciany i laczna wycene',
      measurementAria: 'Jednostka miary',
      wallWidth: 'Szerokosc sciany',
      wallHeight: 'Wysokosc sciany',
      selectedMaterial: 'Wybrany material',
      wallArea: 'Powierzchnia sciany',
      totalPrice: 'Cena laczna',
      chooseMaterial: 'Wybierz karte materialu powyzej',
      enterMetric: 'Wpisz szerokosc i wysokosc w metrach',
      enterImperial: 'Wpisz szerokosc i wysokosc w stopach',
      enterInches: 'Wpisz szerokosc i wysokosc w calach',
      normalizedPricing: 'Cena jest przeliczana do metra kwadratowego.',
      billableArea: '{value} sqm powierzchni rozliczeniowej',
      selectMaterialAndDimensions: 'Wybierz material i wymiary',
      pricingUnlocks: 'Cena pojawi sie po wyborze materialu.',
      addToCart: 'Dodaj do koszyka',
      footnote: 'Wyceny sa pokazywane w {currency} i bazuja na wybranej powierzchni sciany.',
      cartNotice: 'Integracja koszyka wkrotce. {material} jest wyceniony na {price} dla tej sciany.',
      perSqm: 'za sqm',
      perSqft: 'za sqft',
    },
    cta: {
      title: 'Gotowy odmienic swoja przestrzen?',
      start: 'Rozpocznij projekt',
      talk: 'Porozmawiaj z projektantem',
    },
    footer: {
      about: 'O nas',
      services: 'Uslugi',
      projects: 'Projekty',
      contact: 'Kontakt',
    },
  },
  ru: {
    selectors: {
      language: 'Yazyk',
      currency: 'Valyuta',
      promptTitle: 'Ispolzovat lokalnyy yazyk i valyutu?',
      promptBody: 'My obnaruzhili {language} v vashem brauzere. Perekljuchit osnovnuyu chast sayta na {language} s {currency}, ili ostavit angliyskiy i USD?',
      useLocal: 'Ispolzovat {language} + {currency}',
      keepEnglish: 'Ostavit angliyskiy + USD',
      changeLater: 'Vy smozhete izmenit yazyk i valyutu pozhe vpravom verkhnem uglu.',
    },
    hero: {
      title: 'Prevratite svoi steny v roskochnye vpechatleniya',
      subtitle: 'Dizayn sten s pomoshchyu II. Zagruzite. Vizualiziruyte. Oshchutite rezultat.',
      startDesigning: 'Nachat',
    },
    process: {
      title: 'Kak eto rabotaet',
      items: [
        { title: 'Zagruzite vashe prostranstvo' },
        { title: 'Vyberite stil i material' },
        { title: 'II sozdaet predprosmotr' },
        { title: 'Zakazhite dizayn' },
      ],
    },
    visualizer: {
      title: 'Vizualiziruyte vashe prostranstvo',
      subtitle: 'Zagruzite foto komnaty i dorabotayte premium-kontsept steny v bolee spokoynom, redaktsionnom protsesse.',
      uploadStep: '1. Zagruzite foto komnaty',
      tabs: {
        browse: 'Katalog',
        create: 'Sozdat svoi',
      },
      chooseStyleFeel: '2. Vyberite stil i nastroenie',
      chooseWallpaper: '3. Vyberite dizayn oboev',
      chooseWallpaperFiltered: '3. Vyberite iz {count} {filterWord}',
      generatePreview: '4. Sozdat predprosmotr',
      generatePreviewIntro: 'II avtomaticheski opredelit steny i naneset oboi.',
      generatePreviewResolution: 'Finalnye predprosmotry avtomaticheski generiruyutsya v 1K dlya bystroy proverki.',
      generatePreviewButton: 'Sozdat predprosmotr s II',
      createStep: '2. Sozdayte sobstvennye oboi',
      generationFailed: 'Ne udalos sozdat predprosmotr',
      previewTitle: 'Vash predprosmotr',
    },
    materials: {
      title: 'Umnyy vybor materiala',
      subtitle: 'Izuchite nashi premium-nastennye pokrytiya, sozdannye dlya kachestva i stilya.',
      pricingKicker: 'Razmery steny',
      pricingTitle: 'Rasschitayte ploshchad steny i obshchuyu stoimost',
      measurementAria: 'Edinitsa izmereniya',
      wallWidth: 'Shirina steny',
      wallHeight: 'Vysota steny',
      selectedMaterial: 'Vybrannyy material',
      wallArea: 'Ploshchad steny',
      totalPrice: 'Itogovaya tsena',
      chooseMaterial: 'Vyberite kartochnyy material vyshe',
      enterMetric: 'Vvedite shirinu i vysotu v metrah',
      enterImperial: 'Vvedite shirinu i vysotu v futakh',
      enterInches: 'Vvedite shirinu i vysotu v dyuymah',
      normalizedPricing: 'Stoimost normalizovana po kvadratnym metram.',
      billableArea: '{value} sqm oplachivaemoy ploshchadi',
      selectMaterialAndDimensions: 'Vyberite material i razmery',
      pricingUnlocks: 'Stoimost stanet dostupna posle vybora materiala.',
      addToCart: 'Dobavit v korzinu',
      footnote: 'Otsenki pokazyvayutsya v {currency} i osnovany na vybrannoy ploshchadi steny.',
      cartNotice: 'Integratsiya korziny skoro poyavitsya. {material} otsenivaetsya v {price} dlya etoy steny.',
      perSqm: 'za sqm',
      perSqft: 'za sqft',
    },
    cta: {
      title: 'Gotovy pereosmyslit svoyo prostranstvo?',
      start: 'Nachat dizayn',
      talk: 'Pogovorit s dizaynerom',
    },
    footer: {
      about: 'O nas',
      services: 'Uslugi',
      projects: 'Proekty',
      contact: 'Kontakty',
    },
  },
  pt: {
    selectors: {
      language: 'Idioma',
      currency: 'Moeda',
      promptTitle: 'Usar idioma e moeda locais?',
      promptBody: 'Detetamos {language} no seu navegador. Quer usar a maior parte da experiencia em {language} com {currency}, ou manter ingles com USD?',
      useLocal: 'Usar {language} + {currency}',
      keepEnglish: 'Manter ingles + USD',
      changeLater: 'Pode alterar idioma e moeda a qualquer momento nos controlos no canto superior direito.',
    },
    hero: {
      title: 'Transforme as suas paredes em experiencias de luxo',
      subtitle: 'Design de paredes com IA. Carregue. Visualize. Viva a experiencia.',
      startDesigning: 'Comecar',
    },
    process: {
      title: 'Como funciona',
      items: [
        { title: 'Carregue o seu espaco' },
        { title: 'Escolha estilo e material' },
        { title: 'A IA gera a pre-visualizacao' },
        { title: 'Encomende o seu design' },
      ],
    },
    visualizer: {
      title: 'Visualize o seu espaco',
      subtitle: 'Carregue a foto da sua divisao e refine um conceito premium num fluxo mais calmo e editorial.',
      uploadStep: '1. Carregue a foto da sua divisao',
      tabs: {
        browse: 'Explorar catalogo',
        create: 'Criar o seu',
      },
      chooseStyleFeel: '2. Escolha estilo e sensacao',
      chooseWallpaper: '3. Escolha o seu design',
      chooseWallpaperFiltered: '3. Escolha entre {count} {filterWord}',
      generatePreview: '4. Gerar pre-visualizacao',
      generatePreviewIntro: 'A IA vai detetar automaticamente as paredes e aplicar o revestimento.',
      generatePreviewResolution: 'As pre-visualizacoes finais sao geradas automaticamente em 1K para uma revisao mais rapida.',
      generatePreviewButton: 'Gerar pre-visualizacao com IA',
      createStep: '2. Crie o seu revestimento personalizado',
      generationFailed: 'Falha ao gerar a pre-visualizacao',
      previewTitle: 'A sua pre-visualizacao',
    },
    materials: {
      title: 'Selecao inteligente de materiais',
      subtitle: 'Explore os nossos revestimentos murais premium, pensados para qualidade e estilo.',
      pricingKicker: 'Dimensoes da parede',
      pricingTitle: 'Calcule a area da parede e a estimativa total',
      measurementAria: 'Unidade de medida',
      wallWidth: 'Largura da parede',
      wallHeight: 'Altura da parede',
      selectedMaterial: 'Material selecionado',
      wallArea: 'Area da parede',
      totalPrice: 'Preco total',
      chooseMaterial: 'Escolha um cartao de material acima',
      enterMetric: 'Introduza largura e altura em metros',
      enterImperial: 'Introduza largura e altura em pes',
      enterInches: 'Introduza largura e altura em polegadas',
      normalizedPricing: 'O preco e normalizado para metros quadrados.',
      billableArea: '{value} sqm de area faturavel',
      selectMaterialAndDimensions: 'Selecione material e dimensoes',
      pricingUnlocks: 'O preco aparece apos selecionar o material.',
      addToCart: 'Adicionar ao carrinho',
      footnote: 'As estimativas sao apresentadas em {currency} e baseiam-se na area selecionada.',
      cartNotice: 'A integracao com o carrinho chega em breve. {material} esta estimado em {price} para esta parede.',
      perSqm: 'por sqm',
      perSqft: 'por sqft',
    },
    cta: {
      title: 'Pronto para redefinir o seu espaco?',
      start: 'Comecar o seu design',
      talk: 'Falar com um designer',
    },
    footer: {
      about: 'Sobre',
      services: 'Servicos',
      projects: 'Projetos',
      contact: 'Contacto',
    },
  },
}

function deepMerge<T extends Record<string, any>>(base: T, override?: DeepPartial<T>): T {
  if (!override) {
    return structuredClone(base)
  }

  const output = structuredClone(base) as Record<string, any>
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue
    }

    const existingValue = output[key]
    if (Array.isArray(value)) {
      output[key] = value
      continue
    }

    if (
      value &&
      typeof value === 'object' &&
      existingValue &&
      typeof existingValue === 'object' &&
      !Array.isArray(existingValue)
    ) {
      output[key] = deepMerge(existingValue, value as DeepPartial<typeof existingValue>)
      continue
    }

    output[key] = value
  }

  return output as T
}

export function isSupportedLocale(value: string): value is SupportedLocaleCode {
  return SUPPORTED_LOCALES.some((locale) => locale.code === value)
}

export function isSupportedCurrency(value: string): value is SupportedCurrencyCode {
  return SUPPORTED_CURRENCIES.some((currency) => currency.code === value)
}

export function getLanguageCode(locale: SupportedLocaleCode): SupportedLanguageCode {
  return locale.split('-')[0] as SupportedLanguageCode
}

export function getLocaleConfig(locale: SupportedLocaleCode): LocaleConfig {
  return SUPPORTED_LOCALES.find((item) => item.code === locale) || SUPPORTED_LOCALES[0]
}

export function getDefaultCurrencyForLocale(locale: SupportedLocaleCode): SupportedCurrencyCode {
  return getLocaleConfig(locale).defaultCurrency
}

export function getCurrencyConfig(currency: SupportedCurrencyCode): CurrencyConfig {
  return SUPPORTED_CURRENCIES.find((item) => item.code === currency) || SUPPORTED_CURRENCIES[0]
}

export function formatCurrencySelectorLabel(currency: SupportedCurrencyCode): string {
  const config = getCurrencyConfig(currency)
  return `${config.symbol} ${config.code}`
}

export function getMessages(locale: SupportedLocaleCode): AppMessages {
  return deepMerge(EN_MESSAGES, MESSAGE_OVERRIDES[getLanguageCode(locale)] ?? {})
}

export function detectSupportedLocale(browserLocales: readonly string[]): SupportedLocaleCode | null {
  for (const rawLocale of browserLocales) {
    if (!rawLocale) {
      continue
    }

    if (isSupportedLocale(rawLocale)) {
      return rawLocale
    }

    const normalized = rawLocale.replace('_', '-')
    if (isSupportedLocale(normalized)) {
      return normalized
    }

    const [language] = normalized.split('-')
    const prefixMatch = SUPPORTED_LOCALES.find((locale) => locale.languageCode === language)
    if (prefixMatch) {
      return prefixMatch.code
    }
  }

  return null
}

export function convertUsdToCurrency(valueUsd: number, currency: SupportedCurrencyCode): number {
  return valueUsd * USD_TO_CURRENCY_RATES[currency]
}

export function formatCurrencyValue(
  value: number,
  locale: SupportedLocaleCode,
  currency: SupportedCurrencyCode
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatLocalizedNumber(
  value: number,
  locale: SupportedLocaleCode,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

export function interpolate(template: string, variables: Record<string, string | number>): string {
  return Object.entries(variables).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    template
  )
}
