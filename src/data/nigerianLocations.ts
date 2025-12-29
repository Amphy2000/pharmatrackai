// Comprehensive Nigerian states and major LGAs/neighborhoods

export interface Location {
  name: string;
  state?: string;
  lgas?: string[];
}

export interface State {
  name: string;
  capital: string;
  lgas: string[];
}

export const NIGERIAN_STATES: State[] = [
  {
    name: 'Abia',
    capital: 'Umuahia',
    lgas: ['Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano', 'Isiala Ngwa North', 'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa', 'Ohafia', 'Osisioma', 'Ugwunagbo', 'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South', 'Umu Nneochi']
  },
  {
    name: 'Adamawa',
    capital: 'Yola',
    lgas: ['Demsa', 'Fufore', 'Ganye', 'Girei', 'Gombi', 'Guyuk', 'Hong', 'Jada', 'Lamurde', 'Madagali', 'Maiha', 'Mayo-Belwa', 'Michika', 'Mubi North', 'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South']
  },
  {
    name: 'Akwa Ibom',
    capital: 'Uyo',
    lgas: ['Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo', 'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono-Ibom', 'Ika', 'Ikono', 'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat-Enin', 'Nsit-Atai', 'Nsit-Ibom', 'Nsit-Ubium', 'Obot Akara', 'Okobo', 'Onna', 'Oron', 'Oruk Anam', 'Udung-Uko', 'Ukanafun', 'Uruan', 'Urue-Offong/Oruko', 'Uyo']
  },
  {
    name: 'Anambra',
    capital: 'Awka',
    lgas: ['Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North', 'Awka South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North', 'Idemili South', 'Ihiala', 'Njikoka', 'Nnewi North', 'Nnewi South', 'Ogbaru', 'Onitsha North', 'Onitsha South', 'Orumba North', 'Orumba South', 'Oyi']
  },
  {
    name: 'Bauchi',
    capital: 'Bauchi',
    lgas: ['Alkaleri', 'Bauchi', 'Bogoro', 'Damban', 'Darazo', 'Dass', 'Gamawa', 'Ganjuwa', 'Giade', 'Itas/Gadau', 'Jama\'are', 'Katagum', 'Kirfi', 'Misau', 'Ningi', 'Shira', 'Tafawa Balewa', 'Toro', 'Warji', 'Zaki']
  },
  {
    name: 'Bayelsa',
    capital: 'Yenagoa',
    lgas: ['Brass', 'Ekeremor', 'Kolokuma/Opokuma', 'Nembe', 'Ogbia', 'Sagbama', 'Southern Ijaw', 'Yenagoa']
  },
  {
    name: 'Benue',
    capital: 'Makurdi',
    lgas: ['Ado', 'Agatu', 'Apa', 'Buruku', 'Gboko', 'Guma', 'Gwer East', 'Gwer West', 'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi', 'Obi', 'Ogbadibo', 'Ohimini', 'Oju', 'Okpokwu', 'Otukpo', 'Tarka', 'Ukum', 'Ushongo', 'Vandeikya']
  },
  {
    name: 'Borno',
    capital: 'Maiduguri',
    lgas: ['Abadam', 'Askira/Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa', 'Dikwa', 'Gubio', 'Guzamala', 'Gwoza', 'Hawul', 'Jere', 'Kaga', 'Kala/Balge', 'Konduga', 'Kukawa', 'Kwaya Kusar', 'Mafa', 'Magumeri', 'Maiduguri', 'Marte', 'Mobbar', 'Monguno', 'Ngala', 'Nganzai', 'Shani']
  },
  {
    name: 'Cross River',
    capital: 'Calabar',
    lgas: ['Abi', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki', 'Calabar Municipal', 'Calabar South', 'Etung', 'Ikom', 'Obanliku', 'Obubra', 'Obudu', 'Odukpani', 'Ogoja', 'Yakurr', 'Yala']
  },
  {
    name: 'Delta',
    capital: 'Asaba',
    lgas: ['Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East', 'Ethiope West', 'Ika North East', 'Ika South', 'Isoko North', 'Isoko South', 'Ndokwa East', 'Ndokwa West', 'Okpe', 'Oshimili North', 'Oshimili South', 'Patani', 'Sapele', 'Udu', 'Ughelli North', 'Ughelli South', 'Ukwuani', 'Uvwie', 'Warri North', 'Warri South', 'Warri South West']
  },
  {
    name: 'Ebonyi',
    capital: 'Abakaliki',
    lgas: ['Abakaliki', 'Afikpo North', 'Afikpo South', 'Ebonyi', 'Ezza North', 'Ezza South', 'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohaozara', 'Ohaukwu', 'Onicha']
  },
  {
    name: 'Edo',
    capital: 'Benin City',
    lgas: ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba-Okha', 'Oredo', 'Orhionmwon', 'Ovia North-East', 'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde']
  },
  {
    name: 'Ekiti',
    capital: 'Ado-Ekiti',
    lgas: ['Ado-Ekiti', 'Efon', 'Ekiti East', 'Ekiti South-West', 'Ekiti West', 'Emure', 'Gbonyin', 'Ido-Osi', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje', 'Irepodun/Ifelodun', 'Ise/Orun', 'Moba', 'Oye']
  },
  {
    name: 'Enugu',
    capital: 'Enugu',
    lgas: ['Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu', 'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo', 'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi', 'Uzo-Uwani']
  },
  {
    name: 'FCT',
    capital: 'Abuja',
    lgas: ['Abaji', 'Abuja Municipal', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali']
  },
  {
    name: 'Gombe',
    capital: 'Gombe',
    lgas: ['Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo', 'Kwami', 'Nafada', 'Shongom', 'Yamaltu/Deba']
  },
  {
    name: 'Imo',
    capital: 'Owerri',
    lgas: ['Aboh Mbaise', 'Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte', 'Ideato North', 'Ideato South', 'Ihitte/Uboma', 'Ikeduru', 'Isiala Mbano', 'Isu', 'Mbaitoli', 'Ngor Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Onuimo', 'Orlu', 'Orsu', 'Oru East', 'Oru West', 'Owerri Municipal', 'Owerri North', 'Owerri West']
  },
  {
    name: 'Jigawa',
    capital: 'Dutse',
    lgas: ['Auyo', 'Babura', 'Biriniwa', 'Birnin Kudu', 'Buji', 'Dutse', 'Gagarawa', 'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia', 'Jahun', 'Kafin Hausa', 'Kaugama', 'Kazaure', 'Kiri Kasama', 'Kiyawa', 'Maigatari', 'Malam Madori', 'Miga', 'Ringim', 'Roni', 'Sule Tankarkar', 'Taura', 'Yankwashi']
  },
  {
    name: 'Kaduna',
    capital: 'Kaduna',
    lgas: ['Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', 'Jema\'a', 'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga', 'Soba', 'Zangon Kataf', 'Zaria']
  },
  {
    name: 'Kano',
    capital: 'Kano',
    lgas: ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil']
  },
  {
    name: 'Katsina',
    capital: 'Katsina',
    lgas: ['Bakori', 'Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi', 'Dan Musa', 'Dandume', 'Danja', 'Daura', 'Dutsi', 'Dutsin-Ma', 'Faskari', 'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia', 'Katsina', 'Kurfi', 'Kusada', 'Mai\'Adua', 'Malumfashi', 'Mani', 'Mashi', 'Matazu', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango']
  },
  {
    name: 'Kebbi',
    capital: 'Birnin Kebbi',
    lgas: ['Aleiro', 'Arewa Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin Kebbi', 'Bunza', 'Dandi', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse', 'Maiyama', 'Ngaski', 'Sakaba', 'Shanga', 'Suru', 'Wasagu/Danko', 'Yauri', 'Zuru']
  },
  {
    name: 'Kogi',
    capital: 'Lokoja',
    lgas: ['Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela-Odolu', 'Ijumu', 'Kabba/Bunu', 'Koton Karfe', 'Lokoja', 'Mopa-Muro', 'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala', 'Yagba East', 'Yagba West']
  },
  {
    name: 'Kwara',
    capital: 'Ilorin',
    lgas: ['Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin East', 'Ilorin South', 'Ilorin West', 'Irepodun', 'Isin', 'Kaiama', 'Moro', 'Offa', 'Oke Ero', 'Oyun', 'Pategi']
  },
  {
    name: 'Lagos',
    capital: 'Ikeja',
    lgas: ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere']
  },
  {
    name: 'Nasarawa',
    capital: 'Lafia',
    lgas: ['Akwanga', 'Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia', 'Nasarawa', 'Nasarawa Eggon', 'Obi', 'Toto', 'Wamba']
  },
  {
    name: 'Niger',
    capital: 'Minna',
    lgas: ['Agaie', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati', 'Gbako', 'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama', 'Mariga', 'Mashegu', 'Mokwa', 'Muya', 'Paikoro', 'Rafi', 'Rijau', 'Shiroro', 'Suleja', 'Tafa', 'Wushishi']
  },
  {
    name: 'Ogun',
    capital: 'Abeokuta',
    lgas: ['Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Egbado North', 'Egbado South', 'Ewekoro', 'Ifo', 'Ijebu East', 'Ijebu North', 'Ijebu North East', 'Ijebu Ode', 'Ikenne', 'Imeko Afon', 'Ipokia', 'Obafemi Owode', 'Odeda', 'Odogbolu', 'Ogun Waterside', 'Remo North', 'Sagamu']
  },
  {
    name: 'Ondo',
    capital: 'Akure',
    lgas: ['Akoko North-East', 'Akoko North-West', 'Akoko South-East', 'Akoko South-West', 'Akure North', 'Akure South', 'Ese Odo', 'Idanre', 'Ifedore', 'Ilaje', 'Ile Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa', 'Ondo East', 'Ondo West', 'Ose', 'Owo']
  },
  {
    name: 'Osun',
    capital: 'Osogbo',
    lgas: ['Aiyedaade', 'Aiyedire', 'Atakunmosa East', 'Atakunmosa West', 'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Egbedore', 'Ejigbo', 'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ifedayo', 'Ifelodun', 'Ila', 'Ilesa East', 'Ilesa West', 'Irepodun', 'Irewole', 'Isokan', 'Iwo', 'Obokun', 'Odo Otin', 'Ola Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo']
  },
  {
    name: 'Oyo',
    capital: 'Ibadan',
    lgas: ['Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomosho North', 'Ogbomosho South', 'Ogo Oluwa', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo East', 'Oyo West', 'Saki East', 'Saki West', 'Surulere']
  },
  {
    name: 'Plateau',
    capital: 'Jos',
    lgas: ['Barkin Ladi', 'Bassa', 'Bokkos', 'Jos East', 'Jos North', 'Jos South', 'Kanam', 'Kanke', 'Langtang North', 'Langtang South', 'Mangu', 'Mikang', 'Pankshin', 'Qua\'an Pan', 'Riyom', 'Shendam', 'Wase']
  },
  {
    name: 'Rivers',
    capital: 'Port Harcourt',
    lgas: ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai']
  },
  {
    name: 'Sokoto',
    capital: 'Sokoto',
    lgas: ['Binji', 'Bodinga', 'Dange Shuni', 'Gada', 'Goronyo', 'Gudu', 'Gwadabawa', 'Illela', 'Isa', 'Kebbe', 'Kware', 'Rabah', 'Sabon Birni', 'Shagari', 'Silame', 'Sokoto North', 'Sokoto South', 'Tambuwal', 'Tangaza', 'Tureta', 'Wamako', 'Wurno', 'Yabo']
  },
  {
    name: 'Taraba',
    capital: 'Jalingo',
    lgas: ['Ardo Kola', 'Bali', 'Donga', 'Gashaka', 'Gassol', 'Ibi', 'Jalingo', 'Karim Lamido', 'Kurmi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari', 'Yorro', 'Zing']
  },
  {
    name: 'Yobe',
    capital: 'Damaturu',
    lgas: ['Bade', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba', 'Gulani', 'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru', 'Potiskum', 'Tarmuwa', 'Yunusari', 'Yusufari']
  },
  {
    name: 'Zamfara',
    capital: 'Gusau',
    lgas: ['Anka', 'Bakura', 'Birnin Magaji/Kiyaw', 'Bukkuyum', 'Bungudu', 'Chafe', 'Gummi', 'Gusau', 'Kaura Namoda', 'Maradun', 'Maru', 'Shinkafi', 'Talata Mafara', 'Tsafe', 'Zurmi']
  }
];

// Popular neighborhoods in major cities
export const MAJOR_NEIGHBORHOODS: Record<string, string[]> = {
  'Lagos': [
    'Victoria Island', 'Lekki', 'Ikoyi', 'Surulere', 'Yaba', 'Ikeja', 'Ajah', 'Festac', 
    'Ogba', 'Maryland', 'Magodo', 'Gbagada', 'Oshodi', 'Isolo', 'Ilupeju', 'Ogudu',
    'Ojodu', 'Berger', 'Agege', 'Egbeda', 'Alimosho', 'Ojo', 'Apapa', 'Marina',
    'Satellite Town', 'Amuwo Odofin', 'Anthony Village', 'Palm Grove', 'Onipanu'
  ],
  'FCT': [
    'Wuse', 'Wuse 2', 'Garki', 'Maitama', 'Asokoro', 'Gwarinpa', 'Jabi', 'Utako',
    'Lifecamp', 'Kubwa', 'Lugbe', 'Nyanya', 'Karu', 'Mararaba', 'Central Area',
    'Durumi', 'Gudu', 'Lokogoma', 'Katampe', 'Jikwoyi', 'Kuje', 'Gwagwalada'
  ],
  'Rivers': [
    'GRA Phase 1', 'GRA Phase 2', 'GRA Phase 3', 'Rumuokoro', 'Rumuola', 'Eliozu',
    'Woji', 'Trans Amadi', 'D/Line', 'Old GRA', 'Rumuomasi', 'Ada George', 'Choba',
    'Elelenwo', 'Rumukwurushi', 'Mile 1', 'Mile 3', 'Borokiri', 'Town'
  ],
  'Oyo': [
    'Bodija', 'Ring Road', 'Dugbe', 'Mokola', 'Agodi', 'Sango', 'UI', 'Challenge',
    'Oluyole', 'Apata', 'Oke-Ado', 'Eleyele', 'Ojoo', 'Agbowo', 'Bashorun',
    'Iwo Road', 'Moniya', 'New Bodija'
  ],
  'Kano': [
    'Sabon Gari', 'Fagge', 'Nassarawa', 'Tarauni', 'Gwale', 'Kofar Ruwa', 'Zoo Road',
    'Bompai', 'Kumbotso', 'Gwarzo Road', 'Kano City'
  ],
  'Delta': [
    'Warri', 'Effurun', 'Uvwie', 'Ekpan', 'Airport Road', 'Enerhen', 'Jakpa',
    'Ugbomro', 'DSC', 'Orhuvworun', 'Asaba', 'Okpanam', 'Cable Point'
  ],
  'Edo': [
    'GRA', 'Ring Road', 'Sapele Road', 'Siluko', 'Ugbowo', 'Uselu', 'Ekosodin',
    'Textile Mill Road', 'Airport Road', 'Ekehuan', 'Evbuotubu', 'Ugbor', 'Aduwawa'
  ],
  'Anambra': [
    'Awka', 'Onitsha', 'Nnewi', 'GRA Onitsha', 'Fegge', 'Main Market', 'Upper Iweka',
    'Nkpor', 'Ogidi', 'Ifite Awka', 'Amawbia'
  ],
  'Enugu': [
    'Independence Layout', 'GRA', 'Trans-Ekulu', 'New Haven', 'Achara Layout',
    'Coal Camp', 'Ogui', 'Abakpa', 'Emene', 'Uwani', 'Agbani Road'
  ],
  'Kaduna': [
    'Barnawa', 'Sabon Tasha', 'Ungwan Rimi', 'Tudun Wada', 'Narayi', 'Kakuri',
    'Television', 'Malali', 'Mahuta', 'Gonin Gora', 'Kabala', 'Rigasa'
  ]
};

// Get all states as simple array
export const getStateNames = (): string[] => {
  return NIGERIAN_STATES.map(s => s.name);
};

// Get LGAs for a specific state
export const getLGAsForState = (stateName: string): string[] => {
  const state = NIGERIAN_STATES.find(s => s.name.toLowerCase() === stateName.toLowerCase());
  return state?.lgas || [];
};

// Get neighborhoods for a state
export const getNeighborhoodsForState = (stateName: string): string[] => {
  return MAJOR_NEIGHBORHOODS[stateName] || [];
};

// Search locations (states, LGAs, neighborhoods)
export const searchLocations = (query: string, limit: number = 10): { type: 'state' | 'lga' | 'neighborhood'; name: string; state?: string }[] => {
  const results: { type: 'state' | 'lga' | 'neighborhood'; name: string; state?: string }[] = [];
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) return [];
  
  // Search states
  for (const state of NIGERIAN_STATES) {
    if (state.name.toLowerCase().includes(lowerQuery)) {
      results.push({ type: 'state', name: state.name });
    }
    
    // Search LGAs
    for (const lga of state.lgas) {
      if (lga.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'lga', name: lga, state: state.name });
      }
    }
  }
  
  // Search neighborhoods
  for (const [state, neighborhoods] of Object.entries(MAJOR_NEIGHBORHOODS)) {
    for (const neighborhood of neighborhoods) {
      if (neighborhood.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'neighborhood', name: neighborhood, state });
      }
    }
  }
  
  return results.slice(0, limit);
};
