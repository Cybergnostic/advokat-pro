PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS case_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  party1_label TEXT NOT NULL,
  party2_label TEXT NOT NULL DEFAULT '',
  default_role TEXT NOT NULL,
  is_criminal INTEGER NOT NULL DEFAULT 0,
  is_prosecution INTEGER NOT NULL DEFAULT 0,
  tariff_family TEXT NOT NULL DEFAULT 'none',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS case_roles (
  case_type TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (case_type, code),
  FOREIGN KEY (case_type) REFERENCES case_types(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS action_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_type TEXT NOT NULL,
  client_role TEXT NOT NULL DEFAULT 'default',
  action_kind TEXT NOT NULL,
  name TEXT NOT NULL,
  price_mode TEXT NOT NULL DEFAULT 'none',
  price_key TEXT,
  postponed_price_key TEXT,
  fixed_amount REAL,
  postponed_fixed_amount REAL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(case_type, client_role, action_kind, name),
  FOREIGN KEY (case_type) REFERENCES case_types(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tariff_civil_bands (
  id INTEGER PRIMARY KEY,
  max_value REAL NOT NULL,
  submission REAL NOT NULL,
  hearing REAL NOT NULL,
  nonheld REAL NOT NULL,
  appeal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tariff_non_assessable (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  submission REAL NOT NULL,
  hearing REAL NOT NULL,
  nonheld REAL NOT NULL,
  appeal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tariff_criminal_bands (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  defense REAL NOT NULL,
  injured_or_nonheld REAL NOT NULL,
  appeal REAL NOT NULL,
  initial_act REAL NOT NULL,
  other_submission REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS criminal_offenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  article TEXT NOT NULL,
  tariff_band INTEGER NOT NULL,
  min_years REAL NOT NULL DEFAULT 0,
  max_years REAL NOT NULL DEFAULT 0,
  life_sentence INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tariff_band) REFERENCES tariff_criminal_bands(id)
);

INSERT OR IGNORE INTO case_types
(code,name,short_name,party1_label,party2_label,default_role,is_criminal,is_prosecution,tariff_family,sort_order) VALUES
('parnicni','Parnični postupak','Parnični','Tužilac','Tuženi','tuzilac',0,0,'civil',10),
('krivicni','Krivični postupak','Krivični','Okrivljeni','Oštećeni','okrivljeni',1,0,'criminal',20),
('prekrsajni','Prekršajni postupak','Prekršajni','Okrivljeni','Oštećeni','okrivljeni',0,0,'fixed',30),
('upravni','Upravni / Poreski postupak','Upravni/Poreski','Podnosilac','Organ / Protivna str.','podnosilac',0,0,'fixed',40),
('izvrsni','Izvršni postupak','Izvršni','Poverilac','Izvršni dužnik','poverilac',0,0,'enforcement',50),
('vanparnicni','Vanparnični postupak','Vanparnični','Predlagač','Protivnik predlagača','predlagac',0,0,'civil',60),
('tuzilastvo','Postupak pred Tužilaštvom','Tužilaštvo','Klijent','','osumnjiceni',1,1,'criminal',70);

INSERT OR IGNORE INTO case_roles(case_type,code,label,sort_order) VALUES
('parnicni','tuzilac','Tužilac',10),('parnicni','tuzeni','Tuženi',20),
('krivicni','okrivljeni','Okrivljeni',10),('krivicni','osteceni','Oštećeni',20),
('prekrsajni','okrivljeni','Okrivljeni',10),('prekrsajni','osteceni','Oštećeni',20),
('upravni','podnosilac','Podnosilac',10),('upravni','protivnik','Protivnik',20),
('izvrsni','poverilac','Poverilac',10),('izvrsni','duznik','Dužnik',20),
('vanparnicni','predlagac','Predlagač',10),('vanparnicni','protivnik','Protivnik',20),
('tuzilastvo','osumnjiceni','Osumnjičeni',10),('tuzilastvo','okrivljeni','Okrivljeni',20),('tuzilastvo','osteceni','Oštećeni',30);

INSERT OR IGNORE INTO tariff_civil_bands(id,max_value,submission,hearing,nonheld,appeal) VALUES
(0,50000,10000,15000,10000,20000),
(1,850000,15000,20000,12500,30000),
(2,1675000,18750,23750,14375,37500),
(3,3350000,27500,32500,18750,55000),
(4,6700000,37500,42500,23750,75000),
(5,13350000,50000,55000,30000,100000),
(6,26700000,62500,67500,36250,125000),
(7,33350000,75000,80000,42500,150000);

INSERT OR IGNORE INTO tariff_non_assessable(id,label,submission,hearing,nonheld,appeal) VALUES
(0,'Smetanje poseda, razvod, roditeljsko pravo, radni sporovi...',27500,32500,18750,55000),
(1,'Prekršaji pred policijom, nasilje u porodici',30000,35000,20000,60000),
(2,'Službenosti, stambeni, neprocenjivi OS',37500,42500,23750,75000),
(3,'Prekršajni sud — ostali',35000,40000,22500,70000),
(4,'Utvrđ. očinstva, stečaj, neprocenjivi PS...',42500,47500,26250,85000),
(5,'Ostali postupci pred državnim organom',32500,37500,21250,65000),
(6,'Zakonsko izdržavanje',15000,20000,12500,30000),
(7,'Privredni prestupi, poreski/carinski, neprocenjivi VS',50000,55000,30000,100000),
(8,'Ostali sporovi pred Upravnim sudom',60000,65000,35000,120000),
(9,'Autorski sporovi, Ustavni sud, arbitraža',75000,80000,42500,150000);

INSERT OR IGNORE INTO tariff_criminal_bands(id,label,defense,injured_or_nonheld,appeal,initial_act,other_submission) VALUES
(0,'do 3 god.',35000,20000,60000,30000,15000),
(1,'3 do 5 god.',42500,23750,75000,37500,18750),
(2,'5 do 10 god.',55000,30000,100000,50000,25000),
(3,'10 do 15 god.',80000,42500,150000,75000,37500),
(4,'preko 15 god.',105000,55000,200000,100000,50000),
(5,'30–40 god./doživotni',130000,67500,250000,125000,62500);

INSERT OR IGNORE INTO action_types(case_type,client_role,action_kind,name,price_mode,price_key,postponed_price_key,fixed_amount,postponed_fixed_amount,sort_order) VALUES
('parnicni','default','podnesak','Tužba / Podnesak','tariff','pod',NULL,NULL,NULL,10),
('parnicni','default','podnesak','Odgovor na tužbu','tariff','pod',NULL,NULL,NULL,20),
('parnicni','default','podnesak','Prigovor / Replika','tariff','pod',NULL,NULL,NULL,30),
('parnicni','default','podnesak','Žalba na presudu','tariff','zal',NULL,NULL,NULL,40),
('parnicni','default','rociste','Ročište','tariff','roc',NULL,NULL,NULL,10),
('parnicni','default','rociste','Neodržano ročište','tariff','neo','neo',NULL,NULL,20),
('prekrsajni','default','podnesak','Pisana odbrana','fixed',NULL,NULL,35000,NULL,10),
('prekrsajni','default','podnesak','Žalba na presudu','fixed',NULL,NULL,70000,NULL,20),
('prekrsajni','default','podnesak','Zahtev za obnovu postupka','fixed',NULL,NULL,35000,NULL,30),
('prekrsajni','default','rociste','Ročište (pretres)','fixed',NULL,NULL,40000,NULL,10),
('prekrsajni','default','rociste','Neodržano ročište','fixed',NULL,NULL,22500,22500,20),
('upravni','default','podnesak','Podnesak / Zahtev','fixed',NULL,NULL,27500,NULL,10),
('upravni','default','podnesak','Žalba na rešenje organa','fixed',NULL,NULL,55000,NULL,20),
('upravni','default','podnesak','Tužba u upravnom sporu','fixed',NULL,NULL,50000,NULL,30),
('upravni','default','rociste','Ročište / Rasprava','fixed',NULL,NULL,32500,NULL,10),
('upravni','default','rociste','Ročište u upr. sporu','fixed',NULL,NULL,55000,NULL,20),
('upravni','default','rociste','Neodržano ročište','fixed',NULL,NULL,18750,18750,30),
('izvrsni','default','podnesak','Predlog za izvršenje','tariff','pod',NULL,NULL,NULL,10),
('izvrsni','default','podnesak','Prigovor na rešenje','tariff','pod',NULL,NULL,NULL,20),
('izvrsni','default','podnesak','Žalba','tariff','zal',NULL,NULL,NULL,30),
('izvrsni','default','rociste','Ročište','tariff','roc',NULL,NULL,NULL,10),
('izvrsni','default','rociste','Neodržano ročište','tariff','neo','neo',NULL,NULL,20),
('vanparnicni','default','podnesak','Podnesak','tariff','pod',NULL,NULL,NULL,10),
('vanparnicni','default','podnesak','Žalba','tariff','zal',NULL,NULL,NULL,20),
('vanparnicni','default','rociste','Ročište','tariff','roc',NULL,NULL,NULL,10),
('vanparnicni','default','rociste','Neodržano ročište','tariff','neo','neo',NULL,NULL,20);

INSERT OR IGNORE INTO action_types(case_type,client_role,action_kind,name,price_mode,price_key,postponed_price_key,sort_order) VALUES
('krivicni','default','podnesak','Privatna tužba / krivična prijava','criminal','ini',NULL,10),
('krivicni','default','podnesak','Optužni akt','criminal','ini',NULL,20),
('krivicni','default','podnesak','Predlog za preduzimanje dokaznih radnji','criminal','ini',NULL,30),
('krivicni','default','podnesak','Predlog za sporazum o priznavanju','criminal','ini',NULL,40),
('krivicni','default','podnesak','Odgovor na optužnicu','criminal','ini',NULL,50),
('krivicni','default','podnesak','Predlog za ukidanje / zamenu pritvora','criminal','ini',NULL,60),
('krivicni','default','podnesak','Pismena odbrana','criminal','ini',NULL,70),
('krivicni','default','podnesak','Obrazloženi podnesak','criminal','ini',NULL,80),
('krivicni','default','podnesak','Predlog za odlaganje izvršenja kazne','criminal','ini',NULL,90),
('krivicni','default','podnesak','Predlog za kućni pritvor','criminal','ini',NULL,100),
('krivicni','default','podnesak','Molba za uslovni otpust','criminal','ini',NULL,110),
('krivicni','default','podnesak','Zahtev za rehabilitaciju','criminal','ini',NULL,120),
('krivicni','default','podnesak','Žalba na rešenje o pritvoru','criminal','ini',NULL,130),
('krivicni','default','podnesak','Žalba na produženje zabrane napuštanja','criminal','ini',NULL,140),
('krivicni','default','podnesak','Odgovor na žalbu','criminal','ini',NULL,150),
('krivicni','default','podnesak','Molba za pomilovanje','criminal','ini',NULL,160),
('krivicni','default','podnesak','Predlog za ponavljanje postupka','criminal','zal',NULL,170),
('krivicni','default','podnesak','Žalba na presudu','criminal','zal',NULL,180),
('krivicni','default','podnesak','Zahtev za zaštitu zakonitosti','criminal','zal',NULL,190),
('krivicni','default','podnesak','Ustavna žalba','criminal','zal',NULL,200),
('krivicni','default','podnesak','Ostali podnesak','criminal','ost',NULL,210),
('krivicni','default','rociste','Odbrana na pretresu / javnoj sednici','criminal','od','zo',10),
('krivicni','default','rociste','Razgovor sa okrivljenim u pritvoru','criminal','od','zo',20),
('krivicni','default','rociste','Sednica veća / žalbeno ročište','criminal','od','zo',30),
('krivicni','default','rociste','Predkrivični / istražni postupak','criminal','od','zo',40),
('krivicni','default','rociste','Suočavanje i saslušanje svedoka','criminal','od','zo',50),
('krivicni','default','rociste','Neodržan pretres (odloženo)','criminal','zo','zo',60),
('krivicni','default','rociste','Prijem rešenja o zadržavanju','criminal','zo','zo',70),
('krivicni','osteceni','rociste','Zastupanje oštećenog na pretresu','criminal','zo','zo',10),
('krivicni','osteceni','rociste','Sednica veća — oštećeni','criminal','zo','zo',20),
('krivicni','osteceni','rociste','Neodržan pretres (odloženo)','criminal','zo','zo',30);

INSERT OR IGNORE INTO action_types(case_type,client_role,action_kind,name,price_mode,price_key,postponed_price_key,sort_order)
SELECT 'tuzilastvo',client_role,action_kind,name,price_mode,price_key,postponed_price_key,sort_order
FROM action_types WHERE case_type='krivicni';

INSERT OR IGNORE INTO criminal_offenses(name,article,tariff_band,min_years,max_years,life_sentence) VALUES
('Ubistvo','čl.113',3,5,15,0),('Teško ubistvo','čl.114',5,40,40,1),
('Ubistvo na mah','čl.115',1,1,5,0),('Čedomorstvo','čl.116',0,0,3,0),
('Ubojstvo iz nehata','čl.118',0,0,3,0),('Navođenje na samoubistvo','čl.119',1,1,5,0),
('Teška telesna povreda','čl.121',1,1,5,0),('Laka telesna povreda','čl.122',0,0,1,0),
('Učestvovanje u tuči','čl.123',0,0,3,0),('Ugrožavanje sigurnosti','čl.138',0,0,1,0),
('Silovanje','čl.178',2,3,12,0),('Obljuba nad nemoćnim licem','čl.179',2,2,10,0),
('Obljuba zloupotrebom položaja','čl.180',1,1,5,0),('Obljuba sa maloletnikom','čl.181',2,3,15,0),
('Polno uznemiravanje','čl.182a',0,0,1,0),('Iskorišćavanje dece za pornografiju','čl.185a',2,2,10,0),
('Krađa','čl.203',0,0,3,0),('Teška krađa','čl.204',1,1,8,0),
('Razbojnička krađa','čl.205',1,1,8,0),('Razbojništvo','čl.206',2,2,12,0),
('Utaja','čl.207',0,0,3,0),('Prevara','čl.208',0,0,5,0),
('Teška prevara','čl.208a',1,1,8,0),('Iznuda','čl.214',1,1,8,0),
('Zelenaštvo','čl.215',0,0,5,0),('Oštećenje tuđe stvari','čl.212',0,0,3,0),
('Falsifikovanje novca','čl.223',2,2,12,0),('Pranje novca','čl.231',2,2,10,0),
('Utaja poreza i doprinosa','čl.229',1,1,5,0),('Poreska utaja — teži oblik','čl.229 st.3',2,3,12,0),
('Neovlašćena proizvodnja opojnih droga','čl.246',2,3,12,0),('Neovlašćeno držanje droge','čl.246a',0,0,3,0),
('Falsifikovanje isprave','čl.355',0,0,3,0),('Lažno svedočenje','čl.335',1,0,5,0),
('Lažno prijavljivanje','čl.334',0,0,3,0),('Iznuđivanje iskaza','čl.137',1,1,8,0),
('Nedozvoljeno oružje','čl.348',0,0,3,0),('Nedozvol. proiz./promet oružja','čl.348 st.3',1,1,8,0),
('Ugrožavanje javnog saobraćaja','čl.289',0,0,3,0),('Saobraćajna nesreća sa smrtnim ishodom','čl.289 st.4',1,1,8,0),
('Računarska prevara','čl.301',1,0,5,0),('Neovlašćen pristup računaru','čl.302',0,0,2,0),
('Nasilje u porodici','čl.194',0,0,3,0),('Teško nasilje u porodici','čl.194 st.3',1,1,5,0),
('Nasilje u porodici sa smrtnom posledicom','čl.194 st.4',2,2,10,0),
('Zanemarivanje i zlostavljanje maloletnog lica','čl.193',0,0,3,0),
('Protivpravno lišenje slobode','čl.132',0,0,3,0),('Otmica','čl.134',2,2,12,0),
('Uvređivanje','čl.170',0,0,0.5,0),('Kleveta','čl.171',0,0,0.5,0),
('Povreda autorskog prava','čl.198',0,0,3,0),
('Zloupotreba službenog položaja','čl.359',1,1,8,0),('Pronevera','čl.364',1,1,8,0),
('Primanje mita','čl.367',2,2,12,0),('Primanje mita — teški oblik','čl.367 st.3',3,5,15,0),
('Davanje mita','čl.368',1,0,8,0),('Organizovani kriminal','čl.346 st.3',4,10,20,0),
('Terorizam','čl.391',4,5,20,0),('Finansiranje terorizma','čl.393',2,2,12,0),
('Trgovina ljudima','čl.388',3,3,15,0),('Trgovina decom','čl.388 st.3',4,5,20,0),
('Ratni zločin','čl.372',5,10,40,1);

CREATE INDEX IF NOT EXISTS idx_case_roles_type ON case_roles(case_type,sort_order);
CREATE INDEX IF NOT EXISTS idx_action_types_lookup ON action_types(case_type,client_role,action_kind,sort_order);
CREATE INDEX IF NOT EXISTS idx_criminal_offenses_name ON criminal_offenses(name);
