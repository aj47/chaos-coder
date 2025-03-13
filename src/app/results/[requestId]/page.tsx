import React, { useEffect, useState } from 'react';

// Load request data and existing generations
useEffect(() => {
  const loadRequestData = async () => {
    try {
      console.log('Loading request data for ID:', requestId);
      const response = await fetch(`/api/requests/${requestId}`);
      if (!response.ok) {
        throw new Error('Failed to load request data');
      }
      
      const data = await response.json();
      console.log('Request data loaded:', data);
      setRequestData(data);
      
      // Initialize states based on request data
      const initialLoadingStates = new Array(data.config.numGenerations).fill(true);
      setLoadingStates(initialLoadingStates);
      
      const initialResults = new Array(data.config.numGenerations).fill("");
      setResults(initialResults);
      setEditedResults(initialResults);
      
      // Load any existing generations
      console.log('Fetching existing generations for request ID:', requestId);
      const genResponse = await fetch(`/api/generations/${requestId}`);
      if (genResponse.ok) {
        const { generations } = await genResponse.json();
        console.log('Generations response:', generations);
        if (generations?.length) {
          console.log('Found existing generations:', generations.length);
          
          // Process existing generations
          // Sort generations by index (extracted from style field)
          const sortedGenerations = [...generations].sort((a, b) => {
            const indexA = parseInt(a.style.split('_').pop() || '0', 10);
            const indexB = parseInt(b.style.split('_').pop() || '0', 10);
            return indexA - indexB;
          });
          
          const codes = sortedGenerations.map((g: { code: string }) => g.code);
          setResults(codes);
          setEditedResults(codes);
          setLoadingStates(new Array(data.config.numGenerations).fill(false));
          
          // Set generation times if available
          const times: {[key: number]: number} = {};
          sortedGenerations.forEach((g: { generation_time?: number, style: string }) => {
            const index = parseInt(g.style.split('_').pop() || '0', 10);
            if (g.generation_time) times[index] = g.generation_time;
          });
          setGenerationTimes(times);
        } else {
          // No existing generations, start the generation process
          console.log('No existing generations found, starting generation process');
          generateAppsWithStagger(data);
        }
      } else {
        // Error fetching generations, start the generation process
        console.log('Error fetching generations, starting generation process');
        generateAppsWithStagger(data);
      }
    } catch (error) {
      console.error('Error loading request data:', error);
    }
  };

  loadRequestData();
}, [requestId]);

// Generate app with database storage
const generateApp = async (index: number, promptText: string) => {
  if (!requestData) return;
  
  console.log(`Starting generation for index ${index} with prompt: ${promptText.substring(0, 50)}...`);
  const startTime = performance.now();
  try {
    const style = requestData.config.styles[index];
    const modelType = requestData.config.modelTypes[index] || "fast";
    
    console.log(`Sending request to generate API with style: ${style}, modelType: ${modelType}, index: ${index}`);
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: promptText,
        framework: style,
        modelType,
        requestId,
        index
      }),
    });

    console.log(`Generate API response status: ${response.status}`);
  } catch (error) {
    console.error('Error generating app:', error);
  }
};

// ... rest of the component code ... 