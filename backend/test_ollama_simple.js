import ollama from 'ollama';

async function test() {
  console.log('Start');
  try {
    const res = await ollama.generate({
      model: 'llama3.2:3b',
      prompt: 'Why is the sky blue?',
      stream: false
    });
    console.log('Response length:', res.response.length);
  } catch (e) {
    console.error(e);
  }
  console.log('End');
}
test();
