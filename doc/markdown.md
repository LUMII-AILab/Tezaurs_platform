# Šķirkļos izmantojamais markdown

Atsevišķiem šķirkļu laukiem (vispirms jau sense.Gloss) varētu izmantot markdown sintaksi.

Ar to varētu attēlot gan teksta formatējumu (bold, italics, ...), gan arī starpšķirkļu / starpnozīmju saites.

*italics* _italics_ **bold** __bold__ __*bold italics*__ ~~strike~~

Saišu tradicionālais pieraksts markdown-ā:

[saites virsraksts](http://tezaurs.lv/w/suns:1)

Saites būtu jātaisa bez sākumdaļas (```https://tezaurs.lv```), iekļaujot tikai lokālo taku (piemēram, ```/w/suns```) – tas iespējotu pārnesamību starp serveriem un nebojātos starp versijām.

[saites virsraksts](/w/suns:1)

## URIs

Droši vien iekšējo/ārējo saišu pilnajai sintaksei ir jāiekļauj/jāatbalsta viss, ko gribam piedāvāt persistento URI pasaulē, t.sk. atsauces uz:

- konkrētu vārdu + homonīmu + nozīmi

- konkrēta vārda konkrēta homonīma visām nozīmēm

- konkrēta vārda visu homonīmu visām nozīmēm

- viss augstākminētais, norādot konkrētu vārdnīcas laidienu

- daudzvārdu savienojumi (droši vien var saturēt praktiski jebkuru simbolu)

(? vai ir vērts atbalstīt arī, piemēram, konkrēta vārda visu homonīmu pirmās nozīmes?)
