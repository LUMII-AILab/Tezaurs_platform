SET client_encoding = 'UTF8';

DELETE FROM dict.sources;

ALTER SEQUENCE dict.sources_id_seq RESTART WITH 1;

INSERT INTO dict.sources (
    abbr,
    title,
    bib,
    url
)
VALUES
('LE1', '<em>Latvijas Enciklopēdija</em>. 1.–5. Rīga, Valērija Belokoņa izdevniecība, 2002.–2009.', NULL, NULL),
('LpA', '<em>Lielais pasaules atlants</em>. Rīga, Karšu izdevniecība Jāņa sēta, 2008.', NULL, NULL),
('PZT', 'Pasaules zemes un tautas. Ģeogrāfijas vārdnīca. Rīga, Zvaigzne, 1978.', NULL, NULL),
('SV99', '<em>Svešvārdu vārdnīca</em>. Rīga, Jumava, 1999.; 3. izdevums, Rīga, Jumava, 2007.', NULL, NULL),
('ZTV', '<em>Zinātnes un tehnoloģijas vārdnīca</em>. Rīga, Norden AB, 2001.', NULL, NULL),
('ALV', 'Angļu-latviešu vārdnīca. Rīga, Jāņa sēta, 1995.', NULL, NULL),
('BiP', 'Bibliotēku un informācijas pārvaldība. Angļu-latviešu un latviešu-angļu terminu skaidrojošā vārdnīca. Džaneta Stīvensone. Rīga, Zvaigzne ABC, 2001.', NULL, NULL),
('D2', 'Personālie datori. Angļu-latviešu-krievu skaidrojošā vārdnīca. Rīga, A/S DATI, 1998.', NULL, NULL),
('DtsV', 'Diagnostikas terminu skaidrojošā vārdnīca tiem, kas rūpējas par bērniem slimnīcā. Rīga, VSIA «Bērnu klīniskā universitātes slimnīca», 2008.', NULL, NULL),
('EKr', 'Eiropas Parlamenta un Padomes regula. (pirmais skaitlis norāda regulas numuru, otrais pieņemšanas gadu)', NULL, NULL),
('FV', 'Ligers Z. Vāciski-latviska un latviski-vāciska karavīra vārdnīca lietošanai frontē. 3. iespiedums, Aufbau-Verlag, Rīga, 1944.', NULL, NULL),
('i1', 'Latviešu valodas saīsinājumu vārdnīca. Rīga, Avots, 1994.', NULL, NULL),
('Itk', 'LZA Terminoloģijas komisijas Informātikas terminoloģijas apakškomisijas protokols. (skaitlis norāda protokola numuru)', NULL, NULL),
('JtV', 'Latviešu-angļu, angļu-latviešu juridisko terminu vārdnīca. Rīga, Multineo, 2009.', NULL, NULL),
('KrK', 'Krāslavas rajons. Karte 1:100000. Rīga, Jāņa sēta, 2006.', NULL, NULL),
('LaA', 'Mazais Latvijas autoceļu atlants. Rīga, Jāņa sēta, 2011.', NULL, NULL),
('LģE', 'Lielā ģeogrāfijas enciklopēdija. Rīga, Jumava, 2008.', NULL, NULL),
('LP', 'Baumanis J., Blūms P. Latvijas putni. Rīga, Liesma, 1969.', NULL, NULL),
('LvpF', 'Muižniece L. Latviešu valodas praktiskā fonoloģija. Rīga, Rasa ABC, 2002.', NULL, NULL),
('Mit', 'Mitoloģijas vārdnīca. Rīga, Avots, 2004.', NULL, NULL),
('Mūz', 'Mūzikas terminu vārdnīca. Rīga, LVI, 1962.', NULL, NULL),
('Nsī', 'Norādījumi par citvalodu īpašvārdu pareizrakstību un pareizrunu latviešu valodā. VII Spāņu valodas īpašvārdi. Rīga, LZA izdevniecība, 1961.', NULL, NULL),
('PL', 'Preses lasītāja svešvārdu vārdnīca. Rīga, Nordik, 2004.', NULL, NULL),
('PV', 'Ašmanis M. Politikas terminu vārdnīca. Rīga, Zvaigzne ABC, 1999.', NULL, NULL),
('Sen', 'Ruberte I. Senvārdu vārdnīca. Rīga, Zvaigzne ABC, 2004.', NULL, NULL),
('SV04', 'Baldunčiks J., Pokrotniece K. Svešvārdu vārdnīca. Rīga, Jumava, 2005.', NULL, NULL),
('SV51', 'Svešvārdu vārdnīca. Rīga, Latvijas Valsts izdevniecība, 1951.', NULL, NULL),
('T84', 'Latvijas PSR administratīvi teritoriālais iedalījums (1984. gads). Rīga, Avots, 1984.', NULL, NULL),
('VdK', 'Vārdadienu kalendārs 2000.–2003. Rīga, Valsts valodas centrs, 1999.', NULL, NULL),
('VL96', 'Granta K., Pampe E. Vācu-latviešu vārdnīca. Rīga, Avots, 1996.', NULL, NULL),
('VtV', 'Valsts un tiesību vēsture jēdzienos un terminos. Rīga, SIA «Divergens», 2001.', NULL, NULL),
('ZrvI', 'Kagaine E. Lokālie somugrismi latviešu valodas Ziemeļrietumvidzemes izloksnēs. Rīga, LU Latviešu valodas institūts, 2004.', NULL, NULL),
('KV', '<em>Latviešu Konversācijas vārdnīca</em>. 1.–21. Rīga, A. Gulbja apgāds, 1927.–1940.; papildināts faksimilizdevums 1.–22. Rīga, 2000.–2004.', NULL, NULL),
('LME', '<em>Latvju mazā enciklopēdija</em>. Rīga, Grāmatu Draugs, 1935.', NULL, NULL),
('MSV', '<em>Medicīnas svešvārdu vārdnīca</em>. Rīga, Avots, 2007.', NULL, NULL),
('PuA', '<em>Pasaules uzziņu atlants</em>. Rīga, Karšu izdevniecība Jāņa sēta, 2010.', NULL, NULL),
('SLG', 'Bušs O., Ernstsone V. <em>Latviešu valodas slenga vārdnīca</em>. Rīga, Norden AB, 2006.', NULL, NULL),
('Sin', 'Grīnberga E., Kalnciems O., Lukstiņš G., Ozols J. <em>Latviešu valodas sinonīmu vārdnīca</em>. 2. izd. Rīga, Liesma, 1972.; 3. izd. Rīga, Avots, 2002.', NULL, NULL),
('Aug2', 'Ēdelmane I., Ozola Ā. <em>Latviešu valodas augu nosaukumi</em>. Rīga, SIA «Augsburgas institūts», 2003.', NULL, NULL),
('TM', 'Rudzītis K. <em>Terminologia medica</em>. Rīga, 1973.', NULL, NULL),
('LC', '<em>Latvijas ciemi. Nosaukumi, ģeogrāfiskais izvietojums</em>. Rīga, Latvijas Ģeotelpiskās informācijas aģentūra, 2007.', NULL, NULL),
('TM5', 'Rudzītis K. <em>Terminologia medica. Latīņu-latviešu medicīnas terminu vārdnīca</em>. 2003.–2005. gada pārstrādāts un papildināts izdevums. Rīga, 2005.', NULL, NULL),
('V1', 'Dambe V. <em>Latvijas apdzīvoto vietu un to iedzīvotāju nosaukumi</em>. Rīga, Zinātne, 1990.', NULL, NULL),
('ĒiV', 'Kagaine E., Raģe S. <em>Ērģemes izloksnes vārdnīca</em>. 1.–3. Rīga, Zinātne, 1977.–1983.', NULL, NULL),
('ViV', 'Ādamsons E., Kagaine E. <em>Vainižu izloksnes vārdnīca</em>. A–M, N–Ž. Rīga, LU LVI, 2000.', NULL, NULL),
('KiV', 'Reķēna A. <em>Kalupes izloksnes vārdnīca</em>. 1.–2. Rīga, LU LVI, 1998.', NULL, NULL),
('AB1', 'Bīlenšteins A. Latviešu koka celtnes. Rīga, Jumava, 2001.', NULL, NULL),
('AB2', 'Bīlenšteins A. Latviešu koka iedzīves priekšmeti. Rīga, Jumava, 2007.', NULL, NULL),
('LD', '<em>Latvijas daba. Enciklopēdija</em>. 1.–6. Rīga, 1994.–1998.', NULL, NULL),
('ADz', 'Žurnāls Akadēmiskā dzīve, Rīga, 2006.–2015. (pirmais skaitlis norāda žurnāla numuru, otrais – lappusi)', NULL, NULL),
('AkT', 'Švinks U. Akrobātikas terminoloģija. 1.–3., Rīga, Latvijas Sporta pedagoģijas akadēmija, 2002.', NULL, NULL),
('AL07', 'Angļu-latviešu vārdnīca. Rīga, Avots, 2007.', NULL, NULL),
('AmS', 'Angļu un metriskās sistēmas mēri un svari un to pārrēķināšanas tabulas. Vestfāles Hallē, T. Dārziņa grāmatu apgāds, 1946.', NULL, NULL),
('Ang', 'Baldunčiks J. Anglicismi latviešu valodā. Rīga, Zinātne, 1989.', NULL, NULL),
('AtL', 'Autortiesību likums. Rīga, Latvijas Vēstnesis, 148/150 (2059/2061), 27.04.2000.', NULL, NULL),
('EH', 'Endzelīns J., Hauzenberga E. <em>Papildinājumi un labojumi K. Mīlenbaha Latviešu valodas vārdnīcai</em>. Rīga, Kultūras fonds; VAPP, 1934.–1946.', NULL, 'http://tezaurs.lv/mev/'),
('TK', 'LZA Terminoloģijas komisijas lēmums (skaitlis norāda lēmuma numuru; sk. http://termini.lza.lv)', NULL, 'http://termini.lza.lv/index.php?category=2'),
('AtV', 'Arhitektūras terminu vārdnīca. Liepāja, 1998.', NULL, NULL),
('AtvL', 'Administratīvo teritoriju un apdzīvoto vietu likums. Rīga, Latvijas Vēstnesis, 202 (3986), 30.12.2008., ar grozījumiem 23 (4215), 10.02.2010. un 149 (4341), 21.09.2010.', NULL, NULL),
('Aug', 'Pētersone A., Birkmane K. Latvijas PSR augu noteicējs. Rīga, Zvaigzne, 1980.', NULL, NULL),
('BB', 'Bušmane B. Piena vārdi. Rīga, LU LVI, 2007.', NULL, NULL),
('BFvL', 'Likums par budžetu un finanšu vadību. Rīga, Latvijas Vēstnesis, 41(172), 06.04.1994.', NULL, NULL),
('BjT', 'Bieži lietoti jēdzieni un termini. Rīga, Avots, 2004.', NULL, NULL),
('BjV', 'Bioloģijas jēdzienu skaidrojoā vārdnīca. Rīga, Mācību apgāds NT, 1997.', NULL, NULL),
('BLi', 'Blinkena A. Latviešu interpunkcija. Rīga, Zinātne, 1969; Zvaigzne ABC, 2009.', NULL, NULL),
('BsV', 'Kavacis A. Baltu senvēsture. Rīga, Vieda, 2011.', NULL, NULL),
('BtsV', 'Bībeles terminu skaidrojošā vārdnīca. Rīga, Daugava, 2005.', NULL, NULL),
('CaF', 'Aldersons J. Cilvēka anatomijas, fizioloģijas, higiēnas skaidrojošā vārdnīca. Rīga, Zvaigzne ABC, 2000. // Bioloģija pamatskolai. Cilvēks skaidrojošā vārdnīca (ar interneta atslēgvārdiem). Anatomija. Fizioloģija. Higiena. Rīga, Zvaigzne ABC, 2011.', NULL, NULL),
('D', 'Laikraksts «Diena». (pirmais skaitlis norāda datumu, otrais — lappusi)', NULL, NULL),
('D1', 'Angļu-krievu-latviešu skaidrojošā vārdnīca «Datu apstrādes un pārraides sistēmas». Rīga, A/S SWH Informatīvās sistēmas, 1995.', NULL, NULL),
('D3', 'Angļu-latviešu-krievu informātikas vārdnīca: datori, datu apstrāde un pārraide. Rīga, Avots, 2001.', NULL, NULL),
('D89', 'Īsa krievu-latviešu-angļu ražošanas terminu skaidrojošā vārdnīca «Informātika». Rīga, Zvaigzne, 1989.', NULL, NULL),
('DaE', 'Nordhauss K., Dārza augi. Enciklopēdija. Rīga, Zvaigzne ABC, 2003.', NULL, NULL),
('DĒ', 'Dienas Ēdieni. Rīga, Dienas žurnāli, 2008.–2012. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('DeW', 'Votsa L. Dabas enciklopēdija. Rīga, Zvaigzne ABC, 1996.', NULL, NULL),
('DĢ', 'Ancāne I. Dabas ģeogrāfija, skaidrojošā vārdnīca. Rīga, Zvaigzne ABC, 2000.', NULL, NULL),
('Dz', 'Latvijas PSR dzīvnieku noteicējs. 1.–2. Rīga, LVI, 1956.', NULL, NULL),
('DzS', 'Džoiss Dž. Uliss. Tulkojis Dzintars Sodums. Rīga, 2012.', NULL, NULL),
('DzV', 'Kursīte J. Dzejas vārdnīca. Rīga, Zinātne, 2002.', NULL, NULL),
('DžP', 'Džūkstes pasakas. Rīga, Zinātne, 1980.', NULL, NULL),
('EBA', 'Encyclopaedia Britannica Almanac 2003. London, 2002.', NULL, NULL),
('EbV', 'Skaidrojošā vārdnīca ekonomikas bakalauram. Rīga, SolVita, 1994.', NULL, NULL),
('EepV', 'Elektroenerģētikas pamatterminu skaidrojošā vārdnīca. Rīga, Jumava, 1997.', NULL, NULL),
('EF', 'Ekonomikas un finanšu vārdnīca. Rīga, Norden AB, 2003.', NULL, NULL),
('EpV', 'Eponīmu vārdnīca. Sast. B. Bankava, Rīga, Madonas poligrāfists, 2007. Jaunā eponīmu vārdnīca. Precizēts un papildināts izdevums. Sast. A. Bankava, Rīga, Latviešu valodas aģentūra, 2012.', NULL, NULL),
('EStV', 'Eiropas Savienības terminu vārdnīca. Rīga, UNDP, 2004.', NULL, NULL),
('EsV', 'Ekonomikas skaidrojošā vārdnīca. Rīga, Zinātne, 2000.', NULL, NULL),
('EV', 'Enciklopēdiskā vārdnīca 2 sējumos. Rīga, Latvijas Enciklopēdiju redakcija, 1991.', NULL, NULL),
('FA', 'Filozofijas atlants. Rīga, Zvaigzne ABC, 2000.', NULL, NULL),
('FF', 'Rolovs B. Par fiziku un fiziķiem. Rīga, Zinātne, 1989.', NULL, NULL),
('ĢmV', 'Ģeomātikas terminu skaidrojošā vārdnīca. Rīga, RTU Izdevniecība, 2009.', NULL, NULL),
('IPV', 'Ilustrētā Pasaules Vēsture. Rīga, Dienas žurnāli, 2008.–2015. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('Jt1', 'Juridiski terminoloģiskā skaidrojošā vārdnīca. Sast. Jakubaņecs V., Rīga, P&amp;K, 2005.', NULL, NULL),
('KrV', 'Latviešu-krievu-vācu vārdnīca izdota no Tautas Apgaismošanas Ministerijas. Sast. Valdemārs Kr., Maskava, 1879.', NULL, NULL),
('LatV', 'Likumdošanas aktu terminu vārdnīca. Rīga, Senders R, 1999.', NULL, NULL),
('LLe', 'Lielā Latvijas enciklopēdija. Rīga, Zvaigzne ABC, 2005.', NULL, NULL),
('LPil', 'Latvijas pilsētas. Rīga, Preses nams, 1999.', NULL, NULL),
('LxE', 'Lauksaimniecības enciklopēdija. 1.–4. Rīga, LVI, 1962.–1971.', NULL, NULL),
('MitJ', 'Lielā mitoloģijas enciklopēdija. Rīga, Jumava, 2006.', NULL, NULL),
('NeV', 'Kursīte J. Neakadēmiskā latviešu valodas vārdnīca jeb novadu vārdene. Rīga, Madris, 2007.', NULL, NULL),
('P35', 'Salnais V., Maldups A. Pagastu apraksti. (Pēc 1935. gada tautas skaitīšanas materiāliem). Rīga, Valsts statistikas pārvalde, 1935.', NULL, NULL),
('PP', 'Ceplītis L., Miķelsone A., Porīte T., Raģe S. Latviešu valodas pareizrakstības un pareizrunas vārdnīca. Rīga, Avots, 1995.', NULL, NULL),
('SbV', 'Roldugins V. Starptautiskā biznesa skaidrojošā vārdnīca. Rīga, Jumava, 2005.', NULL, NULL),
('SsV', 'Socioloģijas skaidrojošā vārdnīca. Skolām un pašmācībai. Rīga, LU, 1997.', NULL, NULL),
('SV26', 'Svešvārdu vārdnīca. Rīga, A. Gulbja apgāds, 1926.', NULL, NULL),
('SW78', 'Mekons Fr. Svešu vārdu grāmata. Rīga, 1878.', NULL, NULL),
('TtP', 'Krastiņš I. Tiesību teorijas pamatjēdzieni. Rīga, LU, 1996.', NULL, NULL),
('VkG', 'Šmidts P. Valuodas kļūdas un gŗūtumi. Rīga, Izdevis A. Gulbis, 1921.', NULL, NULL),
('VrJ', 'Valodas un rakstības jautājumi. Rīga, Ramaves apgāds, 1940.', NULL, NULL),
('Žrg', 'Latviešu valodas žargona vārdnīca. Austrālijā, Apgāds AIVA, 1990., 1996., Rīga, Avots, 2005.', NULL, NULL),
('Fīa', 'Franču īpašvārdu atveide latviešu valodā. Sast. B. Bankava, Rīga, Zinātne, 2004.', NULL, NULL),
('ĢT', 'Ģenētikas terminu skaidrojošā vārdnīca. Rīga, Galvenā enciklopēdiju redakcija, 1981.', NULL, NULL),
('Ir', 'Ir. Nedēļas žurnāls. Rīga, A/S Cits medijs, 2010.–2014. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('JlV', 'Šlāpins I., Jauno latviešu valoda. Rīga, Ascendum, 2013.', NULL, NULL),
('Kmj', 'Zanders O. Ko Kurzemes meži un jūra šalc. Jumava, 2012.', NULL, NULL),
('KuL', 'Vīķe-Freiberga V. Kultūra un latvietība. Rīga, Karogs, 2010.', NULL, NULL),
('LE', 'Latvju enciklopēdija. Stokholma, Trīs zvaigznes, 1950.', NULL, NULL),
('LLV', 'Švarcbachs R., Bištēviņš E. Latīņu-latvju vārdnīca. Rīga, Valters un Rapa, 1928.', NULL, NULL),
('LV06', 'Latviešu valodas vārdnīca. Rīga, Avots, 2006.', NULL, NULL),
('delf', 'DELFI (publicēšanas datums)', NULL, 'http://www.delfi.lv'),
('DiC', 'Dictionary.com', NULL, 'http://dictionary.com'),
('WLd', 'Internetenciklopēdija «Latvijas daba»', NULL, 'https://www.latvijasdaba.lv'),
('MalV', 'Markus D., Raipulis J. Radošie malēnieši un viņu valoda. Rīga, Apgāds «Latvijas Zinātņu Akadēmijas Vēstis», 2010.', NULL, NULL),
('MIL', 'Justs F. Militāro jēdzienu skaidrojošā vārdnīca ar pamatterminu tulkojumu angļu valodā: 15 300 terminu un vārdkopu. Rīga, Avots, 2008.', NULL, NULL),
('MtV', 'Blūma D. Mazā mākslas vēstures terminu vārdnīca. Rīga, Zvaigzne ABC, 2005.', NULL, NULL),
('NīL', 'Nekustamā īpašuma valsts kadastra likums. Rīga, Latvijas Vēstnesis, 205 (3363), 22.12.2005.', NULL, NULL),
('Ped', 'Pedagoģijas terminu skaidrojošā vārdnīca. Rīga, Zvaigzne ABC, 2000.', NULL, NULL),
('PnL', 'Baumanis j., Klimpiņš V. Putni Latvijā. Palīgs putnu novērošanai dabā. Rīga, Zvaigzne ABC, 2003.', NULL, NULL),
('SbaL', 'Sugu un biotopu aizsardzības likums. Rīga, Latvijas Vēstnesis, 121/122 (2032/2033), 05.04.2000.', NULL, NULL),
('Str', 'Lācītis V. Stroika ar skatu uz Londonu. Rīga, Mansards, 2010.', NULL, NULL),
('SV33', 'Vidiņš J. Svešvārdu grāmata. Rīga, Valters un Rapa, 1933.', NULL, NULL),
('SW86', 'Dravnieks J. Svešu vārdu grāmata. Grāmatniekiem un laikrakstu lasītājiem. Jelgava, apgādājis H. Alunāns, 1886.', NULL, NULL),
('VL10', 'Dravnieks J. Vācu-latviešu vārdnīca. Rīga, 1910.', NULL, NULL),
('VpV', 'Valodas prakse: vērojumi un ieteikumi. Rīga, 1.–4. LU Akadēmiskais apgāds, 2005.–2009.; 5.–7. Latviešu valodas aģentūra, 2010.–2012. (pirmais skaitlis norāda izdevuma numuru, otrais — lappusi)', NULL, NULL),
('FLv', 'Franču-latviešu vārdnīca. Rīga, Liesma, 1973.', NULL, NULL),
('HeL', 'Lancmanis I. Heraldika. Rīga, Neputns, 2007.', NULL, NULL),
('īsz', 'Īsziņu vārdnīca. Rīga, Avots, 2002.', NULL, NULL),
('JūV', 'Jūrniecības terminu skaidrojošā vārdnīca. Rīga, Latvijas Jūras akadēmija, 2001.', NULL, NULL),
('KsV', 'Klauss A. Kontrolings. A–Z skaidrojošā vārdnīca. Rīga, Preses nams, 2000.', NULL, NULL),
('LaV', 'Latviešu-angļu vārdnīca. Sakārtojuši K. Brants un Dr. phil. V. K. Matiuss. Rediģējis Prof. P. Šmits. Rīga, Izdevis A. Gulbis. 1930.', NULL, NULL),
('LL1', 'Latīņu-latviešu vārdnīca. Rīga, Zvaigzne, 1994.', NULL, NULL),
('LtV', 'Likumu terminu vārdnīca. Rīga, Latvijas Vēstnesis, 2004.', NULL, NULL),
('MD', 'Mini Diena. Laikraksta «Diena» pielikums.', NULL, NULL),
('MkV', 'Aldersons J. Mākslas un kultūras vārdnīca ar interneta atslēgvārdiem. Rīga, Zvaigzne ABC, 2011.', NULL, NULL),
('Niī', 'Norādījumi par citvalodu īpašvārdu pareizrakstību un pareizrunu latviešu valodā. XII Itāliešu valodas īpašvārdi. Rīga, Zinātne, 1967.', NULL, NULL),
('OxL', 'Matthews P. H., The Concise Oxford Dictionary of Linguistics. Oxford University Press, 2005.', NULL, NULL),
('Ppk', 'Pasaules politiskā karte. Rīga, Jāņa sēta, 2007.', NULL, NULL),
('RtV', 'Hiršs I., Hirša S. Reliģisko terminu vārdnīca. Rīga, Kristīgās vadības koledža, 2008.', NULL, NULL),
('SpT', 'Kupčs J., Knipše G. Sporta terminu skaidrojošā vārdnīca. Rīga, LSPA, 1992.', NULL, NULL),
('SV21', 'Ducmanis K. Politiska un vispārēja svešvārdu grāmata. Rīga, Daile un darbs, 1921.', NULL, NULL),
('SW08', 'Lībknehts V. Politisku un vispārīgu svešvārdu grāmata. 2. papild. un pārlab. izd. Rīga, Apīnis, 1908.', NULL, NULL),
('TiA', 'Ūsele V. Tilžas izloksnes apraksts. Rīga, LU LVI, 1998.', NULL, NULL),
('VfV', 'Vilks A. Vārdnīca filozofijā vidusskolām. Rīga, RaKa, 2000.', NULL, NULL),
('Vng', 'Vanags J. Medības, atziņas un patiesības. Rīga, Autora izdevums, 2010.', NULL, NULL),
('WA16', 'The World Almanac and Boook of Facts 2016. Infobase Learning, NY, 2015.', NULL, NULL),
('Geo', 'GEO. Rīga, SIA Aģentūra Lilita, 2008.–2014. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('i2', 'Latviešu valodas saīsinājumu vārdnīca. Rīga, Avots, 2003.', NULL, NULL),
('ItsV', 'Broks A., Buligina I., Koķe T., Špona A., Šūmane M., Upmane M. Izglītības terminu skaidrojošā vārdnīca. Rīga, 1988.', NULL, NULL),
('JtU', 'Juridisko terminu vārdnīca uzņēmējdarbībai. Rīga, Ekonomisko reformu institūts, 1997.', NULL, NULL),
('KoL', 'Komerclikums. Rīga, Latvijas Vēstnesis, 158/160 (2069/2071), 04.05.2000.', NULL, NULL),
('La1', 'Lielais Latvijas atlants. Rīga, Karšu izdevniecība Jāņa sēta, 2012.', NULL, NULL),
('LGvv', 'Skujiņa V. Latīņu un grieķu cilmes vārddaļu vārdnīca. Rīga, Kamene, 1999.', NULL, NULL),
('Lo', 'Latviešu-krievu vārdnīca. Sastādījis Prof. J. Loja., Maskava, OGIZ, 1946', NULL, NULL),
('LV87', 'Latviešu valodas vārdnīca. Rīga, Avots, 1987.', NULL, NULL),
('MED', 'Macmillan English Dictionary. Oxford, Bloomsbury Publishing Plc, 2002.', NULL, NULL),
('ML', 'Kārkliņš L. Mūzikas leksikons. Rīga, Zvaigzne, 1990.; RaKa, 2006.', NULL, NULL),
('NlV', 'Vēciņš Ē. Naudas lietas. Skaidrojošā vārdnīca. Rīga, Zvaigzne, 1993.', NULL, NULL),
('PIeL', 'Publisko iepirkumu likums. Rīga, Latvijas Vēstnesis, 65 (3433), 25.04.2006.', NULL, NULL),
('PsA', 'Benešs H. Psiholoģijas atlants. 1. un 2. daļa. Rīga, Zvaigzne ABC, 2001.', NULL, NULL),
('SdtV', 'Sociālā darba terminoloģijas vārdnīca. Rīga, Sociālā darba un sociālās pedagoģijas augsskola «Attīstība», 2000.', NULL, NULL),
('SV06', 'Dravnieks J. Svešu vārdu grāmata. Jelgava, H. Alunāna apgāds, 1906.', NULL, NULL),
('SV69', 'Svešvārdu vārdnīca. Rīga, Liesma, 1969.', NULL, NULL),
('ULW', 'Lettisches Wörterbuch. Erster Theil. Lettisch-deutches Wörterbuch von Bishof Dr. Carl Christian Ulmann. Riga, 1872. Zweiter Theil. Deutsch-lettisches Wörterbuch mit Zugrundelengung des von Bishof Dr. Carl Christian Ulmann zurückgelassenen Manuscriptes bearbeitet von Gustav Braže, Pastor emer. Riga u. Leipzig, 1880.', NULL, NULL),
('VL42', 'Vāciski-latviska vārdnīca. Sakārtojis Ed. Ozoliņš, Rīga, A. Gulbja grāmatu apgādniecība, 1942.', NULL, NULL),
('VsV', 'Valodniecības pamatterminu skaidrojošā vārdnīca. Rīga, LU LVI, 2007.', NULL, NULL),
('ZvD', 'Zvaigžņotā Debess. Rīga, Mācību grāmata, 2013. (pirmais skaitlis norāda izdevuma numuru, otrais — lappusi)', NULL, NULL),
('GrV', 'Grāmatvedības jēdzienu skaidrojošā vārdnīca. Rīga, Avots, 2005.', NULL, NULL),
('IdV', 'Ideju vārdnīca. Rīga, Zvaigzne ABC, 1999.', NULL, NULL),
('KKK', 'Kas, kur, kad: populārākie ikdienas notikumi, cilvēki un fakti Latvijā un pasaulē. Rīga, Jumava, 2006.', NULL, NULL),
('KW1', 'Dravnieks J. Konversācijas vārdnīca. 1. sējums A–I. Jelgava, 1891.–1893.', NULL, NULL),
('Tdb', 'Akadēmiskā terminu datubāze AkadTerm', NULL, 'http://termini.lza.lv'),
('TkDB', 'LZA Terminoloģijas komisijas datu bāze', NULL, 'http://termini.lza.lv'),
('LLv2', 'Bištēviņš E., Švarcbahs R. Latīniski-latviska vārdnīca. Rīga, Valsts apgādniecība, 1940.', NULL, NULL),
('Lv26', 'Latviski-vāciska vārdnīca. Sakārtojis Ed. Ozoliņš, Rīga, A. Gulbja grāmatu spiestuve, 1926.', NULL, NULL),
('MeA', 'Mazā enciklopēdija. Astroloģija. Rīga, Alvīne un Alberts, 2008.', NULL, NULL),
('MiV', 'Strautiņa M. Mārcienas izloksne. Rīga, LU Latviešu valodas institūts, 2007.', NULL, NULL),
('Nfī', 'Norādījumi par citvalodu īpašvārdu pareizrakstību un pareizrunu latviešu valodā. IX Franču valodas īpašvārdi. Rīga, LZA izdevniecība, 1963.', NULL, NULL),
('PmV', 'Pasaules mītu vārdnīca. Rīga, Zvaigzne ABC, 2005.', NULL, NULL),
('R1', 'Pasaules reliģijas. Rīga, Zvaigzne ABC, 2000.', NULL, NULL),
('Sin4', 'Latviešu valodas sinonīmu vārdnīca. Dorisas Šnē redakcijā. Rīga, Avots, 2012.', NULL, NULL),
('SV08', 'Svešvārdu vārdnīca. 25000 vārdu un terminu. Rīga, Avots, 2008.', NULL, NULL),
('SV34', 'Ozoliņš E., Endzelīns J. Svešvārdu vārdnīca. Rīga, A. Gulbja grāmatu spiestuve, 1934.', NULL, NULL),
('TaE', 'Fermēlens N. Telpaugi. Enciklopēdija. Rīga, Zvaigzne ABC, 2003.', NULL, NULL),
('TV', 'Tautsaimniecības vārdnīca. Rīga, Universitāte Rīgā, 1943.–1944.', NULL, NULL),
('VIL', 'Vispārējās izglītības likums. Rīga, Latvijas Vēstnesis, 213/215 (1673/1675), 30.06.1999.', NULL, NULL),
('VlO', 'Verzeichnis lettländischer Orstnamen. Herausgegeben von Hans Feldmann, Verlag von E. Bruhns, Riga, 1938.', NULL, NULL),
('VV', 'Kursīte J. Virtuves vārdene. Rīga, Rundas, 2012.', NULL, NULL),
('ZvP', 'Spuris Z. Zvirbuļveidīgo putnu («Passeriformes») latviskie nosaukumi. Rīga, Zinātne, 1992.', NULL, NULL),
('GM', 'Miķelsone G. Judikatūras nozīme Latvijas kā Demokrātiskas tiesiskas valsts tiesiskajā sistēmā. Prpmocijas darbs. Rīga, LU, 2015.', NULL, NULL),
('IeV', 'Ievas virtuve. Rīga, izdevniecība ''Žurnāls Santa'', 2015. (pirmais skaitlis norāda žurnāla numuru, otrais - lappusi)', NULL, NULL),
('IZ', 'Ilustrētā Zinātne. Rīga, Dienas žurnāli, 2005.–2016. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('KiA', 'Balode S. Kalncempju pagasta Kalnamuižas daļas izloksnes apraksts. Rīga, LU LVI, 2000.', NULL, NULL),
('KW', 'Konversācijas vārdnīca. 1.–4. Rīga, RLB, 1906.–1921.', NULL, NULL),
('Leģ', 'Leģendas. Rīga, Dienas žurnāli, 2007.–2017. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('LLL', 'Latīņu-latviešu vārdnīca. Red. Lukstiņš G., Rīga, LVI, 1955.', NULL, NULL),
('LpmE', 'Latvijas PSR mazā enciklopēdija. 1.–3. Rīga, Zinātne, 1967.–1970.', NULL, NULL),
('MC', 'Nītiņa D. Moderna cilvēka valoda. Rīga, VVA, 2004.', NULL, NULL),
('MfV', 'Rolovs B. Mazā fizikas vārdnīca. Rīga, Liesma, 1971.', NULL, NULL),
('MsL', 'Zemzaris J. Mērs un svars Latvijā 13.–19. gs. Rīga, Zinātne, 1981.', NULL, NULL),
('NGL', 'National Geographic Latvija. Rīga, SIA «ALG periodika LV», 2012.–2016. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('PDE', 'Populārā dabas enciklopēdija. Sast. Kavacs G. Rīga, Jumava, 2007.', NULL, NULL),
('RL', 'Rīgas Laiks. Rīga, SIA «Rīgas Laiks», 2013 (-gads.mēnesis-lappuse)', NULL, NULL),
('SLV', 'Spāņu-latviešu vārdnīca. Rīga, Avots, 2004.', NULL, NULL),
('SV12', 'Svešvārdu vārdnīca. Rīga, A. Raņķa apgāds, 1912.', NULL, NULL),
('SV78', 'Svešvārdu vārdnīca. Rīga, Liesma, 1978.', NULL, NULL),
('TĢ', 'Tacits G. K. Ģermānija. Par Ģermānijas atrašanās vietu un tautām. Rīga, Vēstures izpētes un popularizēšanas biedrība, 2011.', NULL, NULL),
('Va', 'Valodas aktualitātes. Rīga, Valsts valodas aģentūra, 2008.', NULL, NULL),
('VL41', 'Vāciski-latviska vārdnīca. Sakārtojis Ozoliņš Ed., Rīga, Latvju grāmata, 1941.', NULL, NULL),
('VSL', 'Valsts statistikas likums. Rīga, Latvijas Vēstnesis, 306/307 (1021/1022), 25.11.1997.', NULL, NULL),
('Ztv1', 'Zinātniskās terminoloģijas vārdnīca. Rīga, Izglītības ministrijas izdevums, 1922.', NULL, NULL),
('GT', 'Garīgo terminu skaidrojošā vārdnīca. Rīga, Zvaigzne ABC, 2002.', NULL, NULL),
('IfV', 'Oksleids K., Stoklia K., Vertheima Dž. Ilustrētā fizikas vārdnīca. Rīga, Zvaigzne ABC, 1997.', NULL, NULL),
('JkV', 'Johansons A. Latvijas kultūras vēsture, 1710.–1800. Rīga, Jumava, 2011.', NULL, NULL),
('KnG', 'Balode S. Kalnienas grāmata. Rīga, LU LVI, 2008.', NULL, NULL),
('KZ', 'Tā runā zonā. Latvijas argo — kriminālvides žargona vārdnīca. Rīga, Valters un Rapa, 2002.', NULL, NULL),
('LEV', 'Lielā enciklopēdiskā vārdnīca. Rīga, Jumava, 2003.', NULL, NULL),
('LLx', 'Lauksaimniecības leksikons. 1.–3. Rīga, Zelta grauds, 1937.–1939.', NULL, NULL),
('Lv42', 'Latviski-vāciska vārdnīca. Sakārtojis Ed. Ozoliņš, Rīga, A. Gulbja grāmatu apgādniecība, 1942.', NULL, NULL),
('MetV', 'Pandalons V., Pelēce I. Meteoroloģijas terminu vārdnīca. Jelgava, LLU, 2003.', NULL, NULL),
('MūV', 'Torgāns J. Mūzikas terminu vārdenīte. Rīga, Zinātne, 2010.', NULL, NULL),
('Ox', 'Oxford Dictionary and Thesaurus. Oxford, 1997.', NULL, NULL),
('PmE', 'Populārā medicīnas enciklopēdija. Rīga, Zinātne, 1976.', NULL, NULL),
('RiE', 'Rīgas ielas. Enciklopēdija. 1.–3., Rīga, 2001.–2009.', NULL, NULL),
('SiV', 'Putniņa M., Timuška A. Sinoles izloksnes salīdzinājumu vārdnīca. Rīga, LU LVI, 2001.', NULL, NULL),
('SV14', 'Dravnieks J. Svešvārdu grāmata. Jelgava, H. Alunāna apgāds, 1914.', NULL, NULL),
('SvN', 'Klētnieks J. Svētie noslēpumi. Rīga, Zvaigzne ABC, 2012.', NULL, NULL),
('Tr', 'Terra. Latvijas Universitāte, 2000.–2010. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('VeAT', 'Šķirkļa skaidrojumu no vācu valodas tulkoja Ventspils Augstskolas Tulkošanas studiju fakultātes studenti. Prakses vadītāja Silga Sviķe.', NULL, NULL),
('VpJ', 'Valodas prakses jautājumi. Rīga, Ramave, 1935.', NULL, NULL),
('WD', 'The Wordsworth Dictionary of Phrase and Fable. Wordsworth Editions Ltd., 2001.', NULL, NULL),
('GtV', 'Grāmatvedības terminu vārdnīca. Rīga, Latvijas Universitāte, 1998.', NULL, NULL),
('IL', 'Izglītības likums. Rīga, Latvijas Vēstnesis, 343/344 (1404/1405), 29.10.1998.', NULL, NULL),
('JLA', 'Veisbergs A. Jaunā latviešu-angļu vārdnīca. Rīga, Zvaigzne ABC, 2005.', NULL, NULL),
('KLV', 'Krievu-latviešu vārdnīca. 1.–2., Rīga, LVI, 1959; Avots, 2006.', NULL, NULL),
('OxW', 'Oxford Dictionary of English', NULL, 'http://www.oxforddictionaries.com'),
('PnR', 'Iestāžu publikāciju noformēšanas rokasgrāmata. Luksemburga: Eiropas Savienības Publikāciju birojs. 2011.', NULL, 'http://publications.europa.eu/code/lv/lv-000100.htm'),
('KtMS', 'Meikališa Ā., Strada K. Kriminālprocesuālo terminu skaidrojošā vārdnīca. Rīga, RaKa, 2000.', NULL, NULL),
('LdsV', 'Lingvodidaktikas terminu skaidrojošā vārdnīca. Latviešu valodas aģentūra, Rīga, 2011.', NULL, NULL),
('LivP', 'Latviešu izlokšņu vārdnīca. Prospekts. Rīga, LU Latviešu valodas institūts, 2005.', NULL, NULL),
('LPag', 'Latvijas pagasti. Enciklopēdija. 1.–2. Rīga, Preses nams, 2001.–2002.', NULL, NULL),
('LV93', 'Latviešu valodas vārdnīca. Amerikas Latviešu apvienība, 1993.', NULL, NULL),
('MeE', 'Mazā erotikas enciklopēdija. Rīga, Jumava, 2001.', NULL, NULL),
('NRA', 'Laikraksts «Neatkarīgā Rīta Avīze».', NULL, NULL),
('PlN', 'Planētas noslēpumi. Rīga, AS «Lauku Avīze», 2014. (pirmais skaitlis norāda žurnāla numuru, otrais — lappusi)', NULL, NULL),
('Psh', 'Psiholoģijas vārdnīca. Rīga, Mācību grāmata, 1999.', NULL, NULL),
('SD', 'Sestdiena. Rīga, Dienas žurnāli, 2013.–2016. (Pēdējais skaitlis norāda lappusi)', NULL, NULL),
('SV05', 'Ilustrētā svešvārdu vārdnīca. Rīga, Avots, 2005.', NULL, NULL),
('SV58', 'Svešvārdu vārdnīca. Vācija, A. Ozoliņa apgāds, 1958.', NULL, NULL),
('Tc', 'Tunisija. Ceļvedis. Rīga, Zvaigzne ABC, 2008.', NULL, NULL),
('TvV', 'Tūrisma un viesmīlības terminu skaidrojošā vārdnīca. Rīga, LR Ekonomikas ministrija, 2008.', NULL, NULL),
('VjV', 'Skangale L. Vēsturisko jēdzienu skaidrojošā vārdnīca. Rīga, RaKa, 2005.', NULL, NULL),
('VmV', 'Cielava S. Vispārīgā mākslas vēsture. 1.–4. Rīga, Zvaigzne ABC, 1998.–2001.', NULL, NULL),
('VzsV', 'Vides zinību skaidrojošā vārdnīca. Rīga, Jumava, 1999.', NULL, NULL),
('ŽoN', 'Kurzemniece I. Žogu nosaukumi latviešu valodas izloksnēs. LU Latviešu valodas institūts, 2008.', NULL, NULL),
('GV', 'Latviešu, vācu un krievu grāmatrūpniecības vārdnīca. Rīga, Latvju Grāmata, 1942.', NULL, NULL),
('Ig', 'Abens K. Igauņu-latviešu vārdnīca. Rīga, Liesma, 1967.', NULL, NULL),
('J03', 'Jansone I. Galvas segas un plecu segas: lingvistiskais apskats latviešu valodā. Rīga, LU LVI, 2003.', NULL, NULL),
('JV', 'Ernstsone V., Tidriķe L. Jauniešu valoda. Rīga, LU, 2006.', NULL, NULL),
('KtJ', 'Judins A. Krimināltiesību terminu skaidrojošā vārdnīca. Rīga, RaKa, 1999.', NULL, NULL),
('LDzN', 'Latvijas PSR dzīvnieku noteicējs. 1.–2. Rīga, LVI, 1956.–1957.', NULL, NULL),
('LLkž', 'Balkevičius J., Kabelka J. Latviu-lietuviu kalbu žodynas. Vilnius, Mokslas, 1977.', NULL, NULL),
('LPE', 'Latvijas padomju enciklopēdija. 1.–10/2. Rīga, Galvenā enciklopēdiju redakcija, 1981.–1988.', NULL, NULL),
('LvV', 'Dravnieks J. Latvju-vācu vārdnīca. Rīga, Valters un Rapa, 1927.', NULL, NULL),
('MitE', 'Mitoloģijas enciklopēdija. 1.–2. Rīga, Latvijas enciklopēdija, 1993.–1994.', NULL, NULL),
('MV', 'Mīlestības vārdnīca. Rīga, Avots, 2003.', NULL, NULL),
('Nvī', 'Norādījumi par citvalodu īpašvārdu pareizrakstību un pareizrunu latviešu valodā. III Vācu valodas īpašvārdi. Rīga, LZA izdevniecība, 1960.', NULL, NULL),
('PkE', 'Džads T. Pēc kara. Eiropas vēsture pēc 1945. gada. Dienas Grāmata, Rīga, 2007.', NULL, NULL),
('PvV', 'Grava S. Pilsētvides vārdnīca. Rīga, Jāņa Rozes apgāds, 2006.', NULL, NULL),
('SG', 'Rampa T. L. Senču gudrība. Rīga, Alberts XII, 1998.', NULL, NULL),
('SV11', 'Vidiņš J. Svešvārdu grāmata. Rīga, Sinatne, 1911.', NULL, NULL),
('SV96', 'Svešvārdu vārdnīca. Rīga, Norden, 1996.', NULL, NULL),
('TlV', 'Kursīte J. Tautlietu vārdene. Rīga, Nemateriālā kultūras mantojuma valsts aģentūra, 2009.', NULL, NULL),
('VE', 'Veselības enciklopēdija. Rīga, SIA Nacionālais apgāds, 2009.', NULL, NULL),
('VL44', 'Dravnieks J. Vāciski latviska vārdnīca. Rīga, VAPP, 1944.', NULL, NULL),
('VrK', 'Valkas rajons. Rajona karte 1:100000. Rīga, Jāņa sēta, 2008.', NULL, NULL),
('Zkp', 'Stetems B. Zini, ko pērc! Orientieris ķīmikāliju labirintā. Grāmata, ko ņemt līdzi uz veikalu. Rīga, Zvaigzne ABC, 2007.', NULL, NULL),
('Bv', 'Galenieks P. Botaniskā vārdnīca. Rīga, LVI, 1950.', NULL, NULL),
('JT', 'Jānis Torgāns', NULL, NULL),
('MāV', 'Mājas Viesis. Iknedēļas žurnāls. AS "Latvijas Mediji". 2017. (pirmais skaitlis norāda žurnāla numuru, otrais - lappusi)', NULL, NULL),
('LKv', 'Latviešu-krievu vārdnīca. 2 sējumos, Rīga, Liesma, 1979.-1981.', NULL, NULL),
('JūVM', 'Millers L., Jūrniecības vārdnīca. Rīga, Zvaigzne ABC, 2007.', NULL, NULL),
('LiLv', 'Balkevičs J., Balode L., Bojāte A., Subatnieks V. Lietuviešu-latviešu vārdnīca, 2. izdevums, Rīga, Zinātne, 1995.', NULL, NULL),
('T', 'Tēzaura izstrādātāju un lietotāju komentāri.', NULL, NULL),
('LkG', 'Grīns J. Latviski-krieviska vārdnīca. Rīga, Valters un Rapa, 1934.', NULL, NULL),
('KnV', 'Balode S., Jansone I. Kalnienas izloksnes vārdnīca. 1.-2. Rīga, LU LVI, 2017.', NULL, NULL),
('LLVV', '<em>Latviešu literārās valodas vārdnīca</em>. 1.–8. Rīga, Zinātne, 1972.–1996.', NULL, 'http://tezaurs.lv/llvv/'),
('ME', 'Mīlenbahs K. <em>Latviešu valodas vārdnīca</em>. Rediģējis, papildinājis, turpinājis J. Endzelīns. Rīga, Kultūras fonds, 1923.–1932.', NULL, 'http://tezaurs.lv/mev/'),
('Wi', 'Vikipēdija un citi interneta resursi', NULL, 'http://www.wikipedia.org'),
('AV', 'Antropoloģijas vārdnīca.', NULL, 'http://antropologubiedriba.wikidot.com/antropologijas-termini-latviesu-valoda'),
('IuB', 'LR Iepirkumu uzraudzības biroja sludinājumi', NULL, 'http://www.iub.gov.lv'),
('LeK', 'Latviešu valodas eksperu komisijas lēmumi (skaitlis norāda protokola numuru)', NULL, 'http://www.valoda.lv/Konsultacijas/Latviesu_valodas_ekspertu_komisijas_LVEK_lemumi/836/mid_605'),
('MLVV', 'Mūsdienu latviešu valodas vārdnīca. LU Latviešu valodas institūts, 2004.–2014.', NULL, 'http://tezaurs.lv/mlvv/'),
('Vdb', 'Latvijas Ģeotelpiskās informācijas aģentūras Vietvārdu datubāze', NULL, 'https://vietvardi.lgia.gov.lv'),
('WdT', 'DabaTev.lv', NULL, 'http://www.dabatev.lv'),
('ODE', 'Oxford Dictionaries', NULL, 'http://www.oxforddictionaries.com/'),
('LvG', 'Latviešu valodas gramatika. Rīga, LU Latviešu valodas institūts, 2013.', NULL, NULL),
('LtK', 'LVK2018. Līdzsvarotais mūsdienu latviešu valodas tekstu korpuss.', NULL, 'http://korpuss.lv/id/LVK2018'),
('MrJ', 'Mistikas un reliģijas jēdzieni. Rīga, Avots, 2006.', NULL, NULL),
('LZ', 'Cilvēki un notikumi latviešu zemēs no ledus aiziešanas līdz Latvijas valstij. Rīga, LKA, Neputns, 2018.', NULL, NULL),
('tIZ', 'Šķirkļa skaidrojumu no vācu valodas tulkoja Ilze Ziņģe', NULL, NULL),
('Tv01', 'Terminoloģijas vārdnīca. Metālu tehnoloģija un mašīnu elementi. Rīga, LZA, 1958.', NULL, NULL),
('LVK', 'LVK2018. Līdzsvarotais mūsdienu latviešu valodas tekstu korpuss.', NULL, 'http://korpuss.lv/id/LVK2018'),
('MtL', 'Mājturības leksikons. Rīga, Grāmatu Draugs, 1938.', NULL, NULL),
('KL', 'Krauklis J, Ločmelis J. Komunikāciju leksikons. R. Jumava, 2004.', NULL, NULL),
('JdL', 'Jaunuzņēmumu darbības atbalsta likums. Rīga, Latvijas Vēstnesis, 241 (5813), 10.12.2016.', NULL, NULL),
-- new in summer 2019:
('BtV', 'Peile J. Bibliotekaro terminu vārdnīca. Rīga, LVI, 1957.', NULL, NULL),
('IVkV', 'Vilks I. Kā iekārtots Visums. Rīga, Zvaigzne ABC, 2000.', NULL, NULL),
('JtV1', 'Juridisko terminu vārdnīca. Rīga, Nordik, 1998.', NULL, NULL),
('MaE', 'Hermanis J. Mazā astronomijas enciklopēdija. Rīga, Jumava, 2004.', NULL, NULL),
('SV19', 'Ilustrētā svešvārdu vārdnīca. Ap 32000 šķirkļu un 2500 attēlu. R. Avots, 2019.', NULL, NULL),
-- new in august 2019:
('Lūn1', 'Latvijas PSR ūdenstilpju nosaukumi. Īsa izziņa. 1. burtnīca (A–D), 2. burtnīca (E-K), 3. burtnīca (L-M), 4. burtnīca (N-R), 5. burtnīca (S-T), 6. burtnīca (U-Ž), Rīga, LVU, 1984.', NULL, NULL),
('Lūn2', 'Latvijas PSR ūdensteču nosaukumi. Īsa izziņa. 1. burtnīca (A–I), 2. burtnīca (J-M), 3. burtnīca (N-R), 4. burtnīca (S-Ž), Rīga, LVU, 1986.', NULL, NULL),
('ŽV', 'Žagars J., Vilks I. Astronomija augstskolām. Rīga, LU, 2005.', NULL, NULL),
('VKdb', 'Valodas konsultācijas: elektroniskā datubāze', NULL, 'http://www.valodaskonsultacijas.lv/'),
-- new in fall 2019:
('Npī', 'Norādījumi par citvalodu īpašvārdu pareizrakstību un pareizrunu latviešu valodā. V Poļu valodas īpašvārdi. Rīga, Zinātne, 1967; Poļu īpašvārdu pareizrakstība un pareizruna latviešu valodā. 2., papildinātais izdevums. Rīga, Zinātne, 1998.', NULL, NULL),
('Nčsī', 'Norādījumi par citvalodu īpašvārdu pareizrakstību un pareizrunu latviešu valodā. II Čehu un slovaku īpašvārdi. Rīga, Zinātne, 1961.', NULL, NULL),
-- new in dec 2019:
('T78', 'Latvijas PSR administratīvi teritoriālais iedalījums (1978. gads). Rīga, Liesma, 1978.', NULL, NULL),
('VtN', 'Par pasaules valstu un teritoriju nosaukumiem latviešu valodā. Rīga, Latvijas Vēstnesis, 218 (2018/218.9), 05.11.2018.', NULL, NULL),
-- new in pavasaris 2020
('RB', 'Kuzina A. Rūdolfa Blaumaņa valodas vārdnīca. Rīga, 2019.', NULL, NULL),
-- new in july 2020
('LDG', 'Janīna Kursīte. Latviešu dievības un gari. Rīga, Rundas, 2020.', NULL, NULL),
-- new in aug 2020
('TWN', 'Tēzaura izstrādātāju komanda, Latviešu valodas WordNet un vārdu nozīmju nošķiršana, projekts LZP-2019/1-0464.', NULL, NULL);
-- ('', '', NULL, NULL);
