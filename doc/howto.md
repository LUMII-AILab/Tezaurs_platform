# pirmspalaišanas pielāgošana

skriptā ```start``` ir uzrādīts arī JS max pieejamais atmiņas apjoms – var būt nepieciešama pielāgošana, darbinot uz cita servera

Failā ```.env``` atrodas būtiskie lietotnes konfigurācijas parametri (datubāze, ports, shēma, ...)

Piemēram:

```env
PORT=3000
DB_URL=postgres://postgres:........@127.0.0.1:5432/tezdev
DB_SCHEMA="tezaurs"
DICT="tezaurs"
RELEASE=1
STATSSCHEMA="stats"
```


# datubāzes uzpildītāja palaišana

```bash
cd dictloader/app
npm run load
```

# pilno šķirkļu rēķinātāja palaišana

```bash
cd dictviewer/app
npm run prepare
```

# development versijas palaišana

Palaist:
```
npm start
```

Palaist ar pirmkoda izmaiņu novērošanu:
```
npm run mon
```

# produkcijas versijas būvēšana

...

# produkcijas versijas palaišana

...
