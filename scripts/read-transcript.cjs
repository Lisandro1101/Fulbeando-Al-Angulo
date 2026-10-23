const fs = require('fs');
const transcriptPath = 'C:\\Users\\Dell PC\\.gemini\\antigravity-ide\\brain\\c3d4dff2-2b57-4b90-94d1-49716cf9741c\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(transcriptPath)) {
  console.log('Not found');
  process.exit(0);
}
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
lines.forEach((l) => {
  if (!l.trim()) return;
  try {
    const data = JSON.parse(l);
    if (data.type === 'USER_INPUT') {
      console.log('--- USER INPUT ---');
      console.log(data.content);
    }
  } catch (e) {}
});
