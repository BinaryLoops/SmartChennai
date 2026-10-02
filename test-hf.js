const { HfInference } = require("@huggingface/inference");

async function testHF() {
  console.log("Testing HF Provider directly...");
  const hf = new HfInference(process.env.HF_TOKEN);
  try {
    const result = await hf.textToVideo({
      model: "Wan-AI/Wan2.1-T2V-14B",
      provider: "fal-ai",
      inputs: "A futuristic smart city intersection with self-driving cars, daylight, highly detailed, realistic, 4k",
    });
    console.log("Success! Blob returned:", result.type, result.size);
  } catch (err) {
    console.error("HF Error:", err.message || err);
  }
}

testHF();
