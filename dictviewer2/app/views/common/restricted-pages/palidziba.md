# Tests

Šis ir markdown filtra atbalstīto iespēju tests

## Virsraksti

# pirmais līmenis
\# pirmais līmenis

## otrais līmenis
\#\# otrais līmenis

## Teksta formatēšana

\*kursīvs\* *kursīvs* \_kursīvs\_ _kursīvs_ \*\*trekns\*\* **trekns** \_\_trekns\_\_ __trekns__ \~\~pārsvītrots\~\~ ~~pārsvītrots~~ \*\*\*trekns kursīvs\*\*\* ***trekns kursīvs*** \_\_\_trekns kursīvs\_\_\_ ___trekns kursīvs___

un te ==izcelts teksts== teksta vidū

### papildiespējas

augšējais indekss: km\^2\^ km^2^ vai šādi<sup>2</sup>

apakšējais indekss: H\~2\~O H~2~O vai šādi <sub>3</sub>

Šādi formatē \`inline kodu\` `inline kodu`, kurš ir rindas vidū

Šādi noformē saites: \[redzamā daļa\]\(https://saite.uz.kaut.ko\) [redzamā daļa](https://saite.uz.kaut.ko)

Saite, kur lietošana atdalīta no definīcijas: [redzamā daļa][slug1]
Lokālā saite: [redzamā daļa][slug2]

[slug1]: https://saite.uz.kaut.ko
[slug2]: tepatuzvietas

## blokveida konstrukcijas

### Horizontāla svītra

---

### Sakārtots saraksts

1. pirmais
2. otrais
    1. apakšpunkts

        garāks teksts
        
        vēl teksts

    1. vēl viens
3. trešais

### Nesakārtots saraksts

- pirmais
- otrais
  - apakšpunkts
  - vēl viens
- trešais

### ķekšsaraksts

- [x] ieķeksēts
- [ ] neieķeksēts

Cita tipa apakšvirsraksts
-------------------------

Vēl viens
---

## Rindkopa ar rindlauzumiem

Te sākas rinda  
un šī ir nākamā rinda.

## Citāts

Lai citētu, izmantojam simbolu `>`

> šis ir citāts no kāda
> avota
>
> citāta otra rindkopa

> citāts ar sarakstu
> 
> - pirmais
> - otrais

## Definīcijas

trekns
: teksts, kurā burtviedolu veidojošās līnijas ir platākas nekā parasti

kursīvs
: teksts, kurā burtviedoli ir nedaudz nošķiebti pa labi

## Koda bloks nezināmā valodā

```
{ 
    "name": "Bob",
    "Age": 3
}
```

vai

~~~
{ 
    "name": "Bob",
    "Age": 3
}
~~~

### Koda bloks zināmā valodā {#1}

```json
{ 
    "name": "Bob",
    "Age": 3
}
```

## Komentārs (hack) {#2}

[šis ir komentārs]: #

## Emoji

:smile: :joy: :tent: :warning: :memo: :bulb:

## Tabulas {#3}

|col 1|col 2  |  col 3|
|-|-|-|
|v1|v2 | v3|

|col 1|col 2  |  col 3|
|:-|:-:|-:|
|v1|v2 | v3|

## Satura rādītājs

- [pirmais](#1)
- [otrais](#2)
- [trešais](#3)
