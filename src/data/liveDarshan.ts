/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Accurate, temple-specific Virtual Live Darshan details.
// Keyed by Temple.id from src/data/temples.ts — every temple in TEMPLES_LIST
// must have a matching entry here.

export interface LiveDarshanInfo {
  gps: string;
  avgDevotees: number;
  aartiTiming: string;
  priestsChanting: string;
  sanctifiedQuality: string;
  availability: string;
  description: string;
  blessing: string;
}

export const LIVE_DARSHAN_INFO: Record<string, LiveDarshanInfo> = {
  "puri-jagannath": {
    gps: "19.8047° N, 85.8178° E",
    avgDevotees: 210000,
    aartiTiming: "Sandhya Aarti (Sringar Alati), 7:00 PM – 8:00 PM IST",
    priestsChanting: "Shri Jagannath Sevayats (Puja Panda lineage)",
    sanctifiedQuality: "Real-Time Pratyaksha Darshan",
    availability: "Daily feed once updated; some Veshas are streamed only on festival days",
    description: "Standing on Odisha's eastern shore, this 12th-century shrine houses Lord Jagannath, Balabhadra, and Subhadra in sacred neem-wood forms ritually renewed through Nabakalebara. The temple's towering shikhara has watched centuries of Ratha Yatra processions, and its inner sanctum radiates an atmosphere of surrender that pilgrims describe as beyond words. Every offering here carries the weight of unbroken devotion.",
    blessing: "May Lord Jagannath's boundless gaze dissolve your worries and carry your soul toward eternal refuge."
  },
  "bbsr-lingaraj": {
    gps: "20.2379° N, 85.8341° E",
    avgDevotees: 45000,
    aartiTiming: "Mahadipam Evening Lighting, 6:30 PM – 7:15 PM IST",
    priestsChanting: "Lingaraj Temple Rajaguru Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; special Shivratri stream on designated nights",
    description: "Rising from 11th-century Kalinga stonework, Lingaraj Temple enshrines the swayambhu Harihara lingam, worshipped daily with water, milk, and bhang in a ritual unbroken since the Somavamsi era. The sanctum's cool stone corridors and ash-scented air create a hush that quiets the restless mind. Devotees say a single moment before this lingam settles years of inner turmoil.",
    blessing: "May Hara-Hari's united form still every storm in your heart and anchor you in silent devotion."
  },
  "ghatgaon-tarini": {
    gps: "21.2333° N, 85.9333° E",
    avgDevotees: 12000,
    aartiTiming: "Sandhya Dhupa Aarti, 6:00 PM – 6:45 PM IST",
    priestsChanting: "Maa Tarini Ghatgaon Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Feed updates on major worship days; darshan hours vary by season",
    description: "Deep in the Keonjhar forests, Maa Tarini's golden-eyed, vermilion face watches over pilgrims who once followed King Gobinda Bhanja's fateful horseback journey. Fresh green coconuts pile before her shrine as tokens of raw, unembellished faith. The forest air, thick with incense and drums, carries a wildness that softens even the most guarded heart.",
    blessing: "May Maa Tarini's fierce compassion shatter your fears and root you in fearless devotion."
  },
  "purushottampur-tara-tarini": {
    gps: "19.4667° N, 84.6167° E",
    avgDevotees: 16000,
    aartiTiming: "Sandhya Aarti atop Kumari Hills, 6:15 PM – 7:00 PM IST",
    priestsChanting: "Tara Tarini Peetha Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; Tantric rites streamed only on select lunar dates",
    description: "Perched above the Rushikulya river on Kumari Hills, this ancient Shakti Peetha has drawn Tantric seekers for millennia. Twin gemstone forms of Tara and Tarini embody wisdom and liberation, watched over by priests who still practice rites passed down through unbroken lineages. The climb itself becomes a pilgrimage of breath and prayer.",
    blessing: "May Maa Tara and Maa Tarini illuminate your path from confusion into liberating clarity."
  },
  "jajpur-biraja": {
    gps: "20.8500° N, 86.3333° E",
    avgDevotees: 14000,
    aartiTiming: "Sandhya Aarti, 6:30 PM – 7:15 PM IST",
    priestsChanting: "Biraja Kshetra Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; Navratri Shringar streamed on designated nights",
    description: "Named in the Mahabharata as sacred Biraja Kshetra, this Navel Shakti Peetha holds Maa Biraja astride her lion, trident piercing the ego-buffalo Mahishasura. The temple's ancient courtyards still echo with Savitri Vrata chants performed by generations of the same priestly families. Here, worldly ego is said to dissolve at the Goddess's fearless feet.",
    blessing: "May Maa Biraja pierce through your ego's illusions and awaken the strength of your true self."
  },
  "sambalpur-samaleswari": {
    gps: "21.4669° N, 83.9756° E",
    avgDevotees: 18000,
    aartiTiming: "Karuna Aarti, 6:00 PM – 6:45 PM IST",
    priestsChanting: "Samaleswari Temple Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; Nuakhai rites streamed only on the festival date",
    description: "On the banks of the Mahanadi, this 16th-century shrine holds Western Odisha's guardian goddess, her trunk-shaped stone face gilded in gold. Folk drums and Sambalpuri devotional songs fill the courtyard during evening worship, blending regional culture with fierce Shakta devotion. Farmers and traders alike credit her with steady protection through every season's uncertainty.",
    blessing: "May Maa Samaleswari guard your home and harvest, and steady your heart through every season."
  },
  "jagatsinghpur-sarala": {
    gps: "20.1667° N, 86.3167° E",
    avgDevotees: 9000,
    aartiTiming: "Akhanda Diya Seva, 6:00 PM – 6:30 PM IST",
    priestsChanting: "Maa Sarala Temple Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Feed updates on scheduled worship days; Raja Parba rites are seasonal",
    description: "This is the shrine that once blessed peasant-poet Sarala Das with the inspiration to compose the Odia Mahabharata. The eight-armed Goddess, holding weapons of wisdom, draws students, writers, and artists seeking clarity of thought. An unbroken oil lamp burns near her sanctum, symbolizing knowledge that never dims across generations of seekers.",
    blessing: "May Maa Sarala sharpen your intellect and light the lamp of wisdom within your soul."
  },
  "kakatpur-mangala": {
    gps: "19.9333° N, 85.9333° E",
    avgDevotees: 8500,
    aartiTiming: "Sandhya Dhupa Bhoga, 6:15 PM – 7:00 PM IST",
    priestsChanting: "Maa Mangala Kakatpur Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; Nabakalebara rites streamed only in the designated year",
    description: "On the Prachi river's ancient banks, Maa Mangala is uniquely tied to Puri's Nabakalebara tradition — her priests still receive dream-directives guiding the search for sacred neem trees used to carve new Jagannath idols. The lotus-holding Goddess sits in serene padmasana, her stone glow said to intensify during quiet morning bathing rituals.",
    blessing: "May Maa Mangala's auspicious grace guide every decision you make toward lasting good fortune."
  },
  "cuttack-dhabaleswar": {
    gps: "20.5667° N, 85.7333° E",
    avgDevotees: 7000,
    aartiTiming: "Rudra Abhishek Puja, 6:00 PM – 6:40 PM IST",
    priestsChanting: "Dhabaleswar Island Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; Bada Osha Feast streamed only on its yearly date",
    description: "Reached by a graceful suspension bridge over the Mahanadi, this island shrine honors Shiva in his white, purifying form — Dhabaleswar. Legend recalls him turning a black bull white to clear a wrongly accused devotee's name, making this a sanctuary for those seeking justice and forgiveness. River breezes carry temple bells across the water at dusk.",
    blessing: "May Lord Dhabaleswar wash away every wrongful burden and restore purity to your name and spirit."
  },
  "bhadrak-akhandaalamani": {
    gps: "21.0500° N, 86.6167° E",
    avgDevotees: 6500,
    aartiTiming: "Chhamu Vesha Alati, 6:30 PM – 7:15 PM IST",
    priestsChanting: "Akhandalamani Bhadrak Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; Suna Vesha streamed only on special occasions",
    description: "On the Baitarani river's edge, a dark granite lingam discovered by a farmer three centuries ago now draws seekers battling chronic illness and despair. Continuous sandalwood paste cools the deity as priests chant Maha Mrityunjaya mantras for healing. The temple's reputation for curing what medicine cannot has spread devotion far beyond Odisha's borders.",
    blessing: "May Lord Akhandalamani's healing grace restore your body, calm your mind, and renew your will to live fully."
  },
  "kantilo-nilamadhab": {
    gps: "20.4667° N, 85.2000° E",
    avgDevotees: 5500,
    aartiTiming: "Sandhya Dipam, 6:00 PM – 6:40 PM IST",
    priestsChanting: "Nilamadhab Kantilo Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Feed updates on scheduled days; hilltop access affects streaming windows",
    description: "Atop twin hills where the Mahanadi bends, this shrine is considered the spiritual root of the entire Jagannath tradition — legend says tribal devotee Biswabasu worshipped Nilamadhab in secret forest groves before the deity later manifested as Jagannath in Puri. The black stone Vishnu here radiates a quiet, ancestral holiness felt nowhere else.",
    blessing: "May Lord Nilamadhab, the hidden root of Jagannath's grace, reveal the sacred purpose within your own journey."
  },
  "jajpur-chhatia-bata": {
    gps: "20.7500° N, 86.2000° E",
    avgDevotees: 4200,
    aartiTiming: "Sandhya Bhoga Aarti, 6:00 PM – 6:30 PM IST",
    priestsChanting: "Chhatia Bata Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Feed updates on scheduled worship days only",
    description: "Beneath a vast, centuries-old banyan tree, this shrine carries the prophecy of saint Achyutananda Das, who foretold Lord Jagannath would one day reside here during the turning of ages. Balabhadra, Jagannath, and Subhadra stand together beneath sprawling branches, their presence quietly anticipatory, as if the temple itself waits for a destiny still unfolding.",
    blessing: "May the prophecy beneath this sacred banyan remind you that even your waiting is part of the Lord's design."
  },
  "kendrapara-baladevjew": {
    gps: "20.5000° N, 86.4167° E",
    avgDevotees: 6000,
    aartiTiming: "Ratha Snana Alati, 6:15 PM – 7:00 PM IST",
    priestsChanting: "Baladevjew Kendrapara Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; Ratha Yatra streamed only on its festival date",
    description: "Known as the Tulasi Kshetra, this temple is wholly devoted to Lord Baladevjew, Jagannath's elder brother, who stands here bearing his sacred plough. Its own historic Chariot Festival, pulling areca-leaved wooden cars through Kendrapara's streets, echoes Puri's grandeur on a smaller, deeply personal scale. Tulasi leaves offered here are believed to carry his strength.",
    blessing: "May Lord Baladevjew lend you his quiet strength to plough through hardship and stand firm in faith."
  },
  "dhenkanal-kapilash": {
    gps: "20.7167° N, 85.6167° E",
    avgDevotees: 7500,
    aartiTiming: "Chandana Vesha Evening Aarti, 6:00 PM – 6:45 PM IST",
    priestsChanting: "Kapilash Hill Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; Maha Shivratri Kavadi rites are seasonal",
    description: "1,400 feet above Dhenkanal, reached by 1,352 stone steps, Lord Chandrasekhar's mountain shrine has watched pilgrims climb since the Narasinghdev era carrying holy water on Kavadi poles. The high-altitude air, cool and pine-scented, seems to strip away exhaustion the closer one gets to the moon-crowned Shiva within the cave sanctum.",
    blessing: "May Lord Chandrasekhar's mountain stillness lift the weight from your shoulders with every step you climb."
  },
  "varanasi-kashi-vishwanath": {
    gps: "25.3109° N, 83.0107° E",
    avgDevotees: 185000,
    aartiTiming: "Saptarishi Aarti (7 priests), 9:00 PM – 9:45 PM IST",
    priestsChanting: "Kashi Vishwanath Purohit Sevayats",
    sanctifiedQuality: "Real-Time Pratyaksha Darshan",
    availability: "Daily feed once updated; Mangla Aarti pre-dawn slot streamed separately",
    description: "On the eternal ghats of the Ganges, this gold-plated Jyotirlinga has drawn Adi Shankara, Ramakrishna, and Vivekananda into its orbit of infinite light and detachment. Varanasi itself is said to exist outside ordinary time, and standing before Vishwanath's sanctum, pilgrims often describe a dissolving of the boundary between life, death, and liberation.",
    blessing: "May Lord Vishwanath's eternal light guide you gently from illusion toward final liberation."
  },
  "kedarnath-kedarnath": {
    gps: "30.7352° N, 79.0669° E",
    avgDevotees: 95000,
    aartiTiming: "Maha Abhishek Puja, 5:30 AM – 6:30 AM IST",
    priestsChanting: "Kedarnath Rawal Lineage Sevayats",
    sanctifiedQuality: "Seasonal Sanctified Feed",
    availability: "Live only during Yatra season, May to November; closed through Himalayan winter",
    description: "Built by the Pandavas over 3,000 years ago amid the snow-bound Garhwal Himalayas, this triangular stone lingam has endured floods and storms that would have erased lesser shrines. Its very survival through the 2013 disaster is spoken of as living proof of Shiva's protection. Reaching Kedarnath demands genuine physical surrender before spiritual surrender begins.",
    blessing: "May Lord Shiva of Kedarnath shelter you the way these Himalayan peaks have sheltered his shrine through every storm."
  },
  "badrinath-badrinath": {
    gps: "30.7433° N, 79.4938° E",
    avgDevotees: 80000,
    aartiTiming: "Maha Abhishek Puja, 5:00 AM – 6:00 AM IST",
    priestsChanting: "Badrinath Rawal Sevayats",
    sanctifiedQuality: "Seasonal Sanctified Feed",
    availability: "Live only during Yatra season, May to November; closed through Himalayan winter",
    description: "Cradled between the Nar and Narayana ranges, this Char Dham shrine holds a black Shaligram form of Badrinarayan, discovered by Adi Shankara in the Alaknanda's icy currents. Snow-capped peaks frame the temple in a stillness that feels untouched by centuries. Pilgrims often say the mountain air itself seems to hum with quiet meditation here.",
    blessing: "May Lord Badrinarayan's Himalayan serenity settle your restless thoughts into deep, contented peace."
  },
  "katra-vaishno-devi": {
    gps: "33.0303° N, 74.9495° E",
    avgDevotees: 160000,
    aartiTiming: "Maha Atka Aarti (Twice daily), 6:00 AM & 7:00 PM IST",
    priestsChanting: "Vaishno Devi Shrine Board Sevayats",
    sanctifiedQuality: "Real-Time Pratyaksha Darshan",
    availability: "Daily feed once updated; shrine remains open 24 hours with no seasonal closure",
    description: "Trekking 13 kilometers through the Trikuta Hills, pilgrims chant 'Jai Mata Di' toward a natural cave holding three ancient rock Pindies — Mahakali, Mahalakshmi, and Mahasaraswati. Legend holds that Vaishno Devi practiced penance here before ending a demonic reign of terror. The climb itself becomes an act of devotion long before the cave is reached.",
    blessing: "May Maa Vaishno Devi's cave of light burn away every demon of doubt within your heart."
  },
  "vrindavan-banke-bihari": {
    gps: "27.5810° N, 77.7006° E",
    avgDevotees: 58000,
    aartiTiming: "Shringar Aarti (Without Bells), 9:30 AM – 10:00 AM IST",
    priestsChanting: "Banke Bihari Goswami Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; curtains are drawn periodically even during darshan hours",
    description: "Established by musician-saint Swami Haridas, this shrine holds Krishna in his mesmerizing three-fold bent stance, so intensely loving that curtains are drawn periodically to spare devotees his overwhelming gaze. No temple bells ring here, preserving an intimacy meant to feel personal rather than ceremonial. Vrindavan's flute-laced air seems to linger longest at this sanctum.",
    blessing: "May Banke Bihari's tender gaze fill your heart with the same devotion Radha once poured into every glance."
  },
  "vrindavan-prem-mandir": {
    gps: "27.6033° N, 77.6883° E",
    avgDevotees: 40000,
    aartiTiming: "Maha Aarti & Musical Fountain, 7:00 PM – 8:00 PM IST",
    priestsChanting: "Jagadguru Kripalu Parishat Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; illuminated fountain show streamed at dusk only",
    description: "Carved entirely from Italian Carrara marble, this modern marvel brings Radha-Krishna's divine pastimes to life through luminous 3D sculpture and nightly illumination. Sita-Ram share the sanctum alongside Radha-Krishna, doubling the temple's devotional resonance. Families gather each evening as fountains and lights transform the marble courtyard into something between a shrine and a living storybook.",
    blessing: "May the radiant love of Radha-Krishna illuminate your relationships with the same devotion carved into this marble."
  },
  "haridwar-har-ki-pauri": {
    gps: "29.9457° N, 78.1642° E",
    avgDevotees: 47000,
    aartiTiming: "Maha Ganga Evening Aarti, 6:30 PM – 7:15 PM IST",
    priestsChanting: "Har Ki Pauri Ganga Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; ghat remains open 24 hours with Aarti at sunset",
    description: "At the exact point where the Ganges leaves the Himalayas for the plains, thousands of floating diyas drift downstream each evening as priests raise flaming lamps in unison. King Vikramaditya built this ghat in memory of his brother, and Vishnu's footprint remains pressed into stone here. The river's current itself feels like a moving prayer.",
    blessing: "May Mother Ganga's flowing grace carry away your burdens the way she carries every offered diya downstream."
  },
  "kangra-jwala-ji": {
    gps: "31.8667° N, 76.3167° E",
    avgDevotees: 22000,
    aartiTiming: "Sringar Aarti (Midnight), 11:30 PM – 12:15 AM IST",
    priestsChanting: "Jwala Ji Temple Sevayats",
    sanctifiedQuality: "Standard Sanctified Feed",
    availability: "Daily feed once updated; flame intensity naturally varies by season",
    description: "Unlike any other shrine, Jwala Ji holds no carved idol — only nine eternal blue flames burning ceaselessly from bare rock fissures, representing Mahakali, Mahalakshmi, Mahasaraswati and their divine sisters. The fuel-less fire has long puzzled onlookers; devotees simply call it proof of the Goddess's uninterrupted presence across centuries of pilgrimage.",
    blessing: "May the eternal flame of Jwala Devi burn steadily within you, undimmed by any darkness life brings."
  },
  "somnath-somnath": {
    gps: "20.8880° N, 70.4012° E",
    avgDevotees: 70000,
    aartiTiming: "Soma Aarti & Damru Concert, 7:00 PM – 7:45 PM IST",
    priestsChanting: "Somnath Trust Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; seaside Aarti timing shifts slightly by season",
    description: "Rebuilt seven times across history, Somnath stands as living testimony to Sanatan Dharma's indestructible spirit. Legend holds the Moon God built the first golden temple here to lift Shiva's curse, and today the swayambhu lingam overlooks the Arabian Sea's endless horizon. Every wave crashing below seems to echo the temple's own story of destruction and rebirth.",
    blessing: "May Lord Somnath's unbroken endurance remind you that no fall is final when faith remains standing."
  },
  "dwarka-dwarkadhish": {
    gps: "22.2442° N, 68.9685° E",
    avgDevotees: 68000,
    aartiTiming: "Sandhya Shringar Aarti, 7:00 PM – 7:45 PM IST",
    priestsChanting: "Dwarkadhish Jagat Mandir Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; flag-changing ceremony streamed five times daily",
    description: "Rising five stories at the meeting point of the Gomti river and the sea, this 2,200-year-old Jagat Mandir crowns Krishna as Dwarkadhish, King of Kings. Its legendary banner is ceremonially changed five times each day, billowing against sea winds that have watched empires rise and fall around this eternal seat of royal devotion.",
    blessing: "May Lord Dwarkadhish's royal grace crown your efforts with the quiet dignity of true kingship."
  },
  "nashik-trimbakeshwar": {
    gps: "19.9319° N, 73.5306° E",
    avgDevotees: 38000,
    aartiTiming: "Rudra Abhishek, 6:00 PM – 6:45 PM IST",
    priestsChanting: "Trimbakeshwar Purohit Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; Narayan Nagbali rites streamed on selected dates",
    description: "At the foothills of Brahmagiri, source of the sacred Godavari, this extraordinary Jyotirlinga holds three faces within a single hollow stone — Brahma, Vishnu, and Maheshwar united as cosmic trinity. Few lingams anywhere carry this triune symbolism, making Trimbakeshwar a rare meeting point of creation, preservation, and dissolution within one unbroken form.",
    blessing: "May the triune power of Trimbakeshwar bring balance to every creation, struggle, and ending in your life."
  },
  "mumbai-siddhivinayak": {
    gps: "19.0170° N, 72.8302° E",
    avgDevotees: 120000,
    aartiTiming: "Kakad Aarti (Pre-dawn), 5:30 AM – 6:00 AM IST",
    priestsChanting: "Siddhivinayak Trust Sevayats",
    sanctifiedQuality: "Real-Time Pratyaksha Darshan",
    availability: "Daily feed once updated; Sankashti Chaturthi Aarti streamed on monthly dates",
    description: "Since 1801, Mumbai's most beloved shrine has drawn everyone from struggling students to film stars beneath its golden dome. Ganesha's trunk turns right here — the rarer, more powerful Siddhi orientation — flanked by consorts Siddhi and Riddhi. Mumbai's relentless pace seems to pause, if only briefly, in the hush before this single-stone deity.",
    blessing: "May Siddhivinayak clear every obstacle standing between you and the fulfillment of your sincerest wish."
  },
  "kolhapur-mahalakshmi": {
    gps: "16.7050° N, 74.2433° E",
    avgDevotees: 42000,
    aartiTiming: "Suna Vesha Puja, 6:30 PM – 7:15 PM IST",
    priestsChanting: "Mahalakshmi Kolhapur Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; sun-ray Kirnotsav alignment streamed twice yearly",
    description: "One of the six great Shakti Peethas named in the Puranas, this temple is architecturally aligned so twice each year the setting sun's rays fall directly on the Goddess's gemstone face through a carved lattice window — a phenomenon called Kirnotsav that pilgrims travel great distances to witness in person.",
    blessing: "May Mahalakshmi's radiant abundance touch your life the way sunlight touches her sacred gemstone face."
  },
  "sarangpur-kashtabhanjan-hanuman": {
    gps: "22.6167° N, 71.8333° E",
    avgDevotees: 30000,
    aartiTiming: "Swarna Chola Alati, 7:00 PM – 7:45 PM IST",
    priestsChanting: "Sarangpur Hanumanji Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; Shani-Shanti offerings streamed on Saturdays",
    description: "Founded by Sadguru Gopalanand Swami, this temple's warrior-postured Hanuman famously presses Shani Dev submissively underfoot, drawing seekers battling planetary affliction and emotional turmoil from across India. Countless testimonies describe relief from anxiety and distress after sincere prayer here, earning Hanuman the enduring title Kashtabhanjan — Crusher of Sorrows.",
    blessing: "May Kashtabhanjan Hanuman crush every sorrow pressing on your mind and restore your inner courage."
  },
  "guwahati-kamakhya": {
    gps: "26.1665° N, 91.7036° E",
    avgDevotees: 60000,
    aartiTiming: "Maha Snana & Dhupa, 6:00 PM – 6:45 PM IST",
    priestsChanting: "Kamakhya Nilachal Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; Ambubachi Mela rites streamed only during the annual mela",
    description: "Perched on Nilachal Hills, Kamakhya holds no carved statue — only a natural spring flowing through a cleft in ancient schist bedrock, worshipped as the very womb of Adi Shakti. The Ambubachi Mela, honoring Earth's creative cycle, transforms this Tantric crown jewel into one of India's most intensely devotional gatherings each year.",
    blessing: "May Maa Kamakhya's creative Shakti awaken new beginnings wherever your life feels stagnant or stuck."
  },
  "kolkata-kalighat": {
    gps: "22.5193° N, 88.3425° E",
    avgDevotees: 55000,
    aartiTiming: "Sandhya Arati, 6:00 PM – 6:45 PM IST",
    priestsChanting: "Kalighat Kali Temple Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; Kali Puja night rites streamed only on the festival date",
    description: "On the old course of the Hooghly, this fiercely revered Shaktipith marks where Sati's right toe is believed to have fallen. Maa Kali's dark eyes, silver crown, and extended golden tongue confront devotees with divine ferocity rather than gentle comfort — a reminder that transformation sometimes requires facing what frightens us most.",
    blessing: "May Maa Kali's fearsome grace burn away what no longer serves your growth and rebirth."
  },
  "kolkata-dakshineswar": {
    gps: "22.6547° N, 88.3573° E",
    avgDevotees: 50000,
    aartiTiming: "Sandhya Alati, 6:15 PM – 7:00 PM IST",
    priestsChanting: "Dakshineswar Ramakrishna Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; Ramakrishna's room pilgrimage hours are limited",
    description: "Built in 1855 by the philanthropic Rani Rashmoni, this riverside temple became the spiritual laboratory of Sri Ramakrishna Paramahansa, whose mystical visions of Maa Kali here sparked a worldwide spiritual renaissance. Bhavatarini stands on Shiva's white basalt chest, and the room where Ramakrishna once meditated still draws seekers of direct mystical experience.",
    blessing: "May Maa Bhavatarini carry you, as her name promises, safely across every turbulent river of doubt."
  },
  "deoghar-baidyanath": {
    gps: "24.4834° N, 86.7000° E",
    avgDevotees: 65000,
    aartiTiming: "Sringar Offering & Rudrabhishek, 6:00 PM – 7:00 PM IST",
    priestsChanting: "Baba Baidyanath Deoghar Sevayats",
    sanctifiedQuality: "HD Sanctified Darshan Feed",
    availability: "Daily feed once updated; Sravani Mela Kanwar Yatra rites are seasonal (July–August)",
    description: "Also called Baba Dham, legend recalls Ravana offering his own ten heads to Shiva here, only to be healed by the Lord acting as Vaidya — the Divine Physician. Sacred red threads still bind this Jyotirlinga to Gauri's temple across the courtyard, and each monsoon, millions of Kanwariyas carry Ganga water here on foot in devoted pilgrimage.",
    blessing: "May Baidyanath, the Divine Physician, heal what medicine alone cannot reach within you."
  }
};
