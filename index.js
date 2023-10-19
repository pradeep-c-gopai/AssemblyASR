const express = require('express');

const multer = require('multer');

const path = require('path');

const axios = require('axios');

const app = express();

const apiKey = '1ff5f74185dd4611bda36e9f226d046e'; // Replace with your actual API key

const baseUrl = 'https://api.assemblyai.com/v2';

// Set up multer to handle file uploads
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

app.use(upload.single('audio'));

app.post('/transcribe', async (req, res) => {

  try {

    if (!req.file) {

      return res.status(400).json({ error: 'No file uploaded' });

    }

    const audioData = req.file.buffer;

    console.log(audioData);

    // Step 1: Upload audio data to the AssemblyAI API
    const uploadResponse = await axios.post(`${baseUrl}/upload`, audioData, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'audio/wav',
      },
    });

    const uploadUrl = uploadResponse.data.upload_url;

    // Step 2: Create a JSON payload containing the audio_url parameter
    const data = {
      audio_url: uploadUrl,
    };

    // Step 3: Make a POST request to the AssemblyAI API to start transcription
    const response = await axios.post(`${baseUrl}/transcript`, data, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Step 4: Poll the API until the transcription is completed
    const transcriptId = response.data.id;

    const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`;

    while (true) {
      
      const pollingResponse = await axios.get(pollingEndpoint, {
        headers: {
          Authorization: apiKey,
        },
      });

      const transcriptionResult = pollingResponse.data;

      if (transcriptionResult.status === 'completed') {

        res.json({ text: transcriptionResult.text });

        break;

      } else if (transcriptionResult.status === 'error') {

        res.status(500).json({ error: `Transcription failed: ${transcriptionResult.error}` });

        console.log(transcriptionResult.error);

        break;

      } else {

        await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 3 seconds

      }

    }

  } catch (error) {

    res.status(500).json({ status: 'Error transcribing audio', error: error });

  }

});

const port = process.env.PORT || 3000;

app.listen(port, () => {

  console.log(`Server is listening on port ${port}`);

});
