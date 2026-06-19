const AdmZip = require('adm-zip');

function decodeBase64ZipToJson(contentResponse) {
  if (!contentResponse) throw new Error('contentResponse vuoto');

  const zipBuffer = Buffer.from(contentResponse, 'base64');
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  if (!entries.length) throw new Error('ZIP GME vuoto');

  const jsonEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.json')) || entries[0];
  const raw = jsonEntry.getData().toString('utf8');

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Errore parsing JSON estratto da ZIP: ${err.message}`);
  }
}

module.exports = { decodeBase64ZipToJson };
