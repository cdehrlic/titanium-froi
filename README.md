# titanium-froi
Workers comp claims portal

## Optional: Spanish statement translation

Witness and claimant statements can be given in Spanish (the English/Español switch on the follow-up form). To add an English translation under each Spanish answer in the statement PDFs, set `ANTHROPIC_API_KEY` in the Railway environment variables. `ANTHROPIC_MODEL` is optional and defaults to `claude-haiku-4-5-20251001`. Without a key, Spanish statements still work; the follow-up email notes that no translation was added.
