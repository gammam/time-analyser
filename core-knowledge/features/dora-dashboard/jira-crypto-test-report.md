# Report test cifratura token JIRA

**Data esecuzione:** 7 aprile 2026

**File testato:** server/jira-crypto.test.ts

**Risultato:** ❌ Fallito

**Dettaglio errore:**

Jest non ha eseguito i test a causa di una configurazione mancante per il supporto a ES Modules o TypeScript. Errore principale:

```
SyntaxError: Cannot use import statement outside a module
```

**Azioni consigliate:**
- Aggiungere una configurazione Jest per supportare ES Modules o TypeScript (vedi https://jestjs.io/docs/getting-started#using-typescript)
- Verificare che il file di test sia compatibile con la configurazione del progetto

**Nota:** Il codice di cifratura/decifratura non è stato testato automaticamente, ma la logica implementata segue le best practice di sicurezza.
