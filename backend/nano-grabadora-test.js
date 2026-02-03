require('dotenv').config();
const { createClient } = require('@deepgram/sdk');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

const prisma = new PrismaClient();

async function runNanoGrabadora(filePath) {
  console.log('\n🚀 Starting NanoGrabadora MVP Test...\n');
  console.log(`📂 Source File: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error('❌ Error: File does not exist.');
    return;
  }

  try {
    // 1. Setup Clients
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    // 2. Transcribe
    console.log('\n🎤 Step 1: Transcribing with Deepgram...');
    const fileStream = fs.createReadStream(filePath);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      fileStream,
      {
        model: 'nova-2',
        smart_format: true,
        diarize: true,
        language: 'es',
      },
    );

    if (error) throw error;
    const fullText = result.results.channels[0].alternatives[0].transcript;
    console.log(`✅ Transcription success. Length: ${fullText.length} chars.`);

    // 3. Analyze (Simplified Groq Call)
    console.log('\n🧠 Step 2: Analyzing with Groq...');
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Resume el siguiente audio en 3 puntos clave.',
        },
        { role: 'user', content: fullText },
      ],
      model: 'llama-3.3-70b-versatile',
    });

    const summary = response.choices[0].message.content;
    console.log('\n📝 Summary:\n', summary);

    console.log('\n✅ ALL STEPS PASSED IN NANOGRABADORA!\n');
  } catch (err) {
    console.error('\n❌ ERROR IN PIPELINE:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

// Usage: node nano-grabadora-test.js <path_to_audio_in_uploads>
const pathArg = process.argv[2] || 'uploads/test1.m4a'; // Default if exists
runNanoGrabadora(pathArg);
