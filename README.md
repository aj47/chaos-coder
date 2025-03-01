# 4xDev

## Overview
4xDev is a Streamlit-based application that leverages the Groq LLM API with Llama3-70B model to generate four variations of web applications simultaneously. This tool helps developers quickly explore different implementation possibilities for their web application ideas.

## Purpose
The purpose of 4xDev is to accelerate the development process by providing multiple variations of code solutions for web applications. By generating four different approaches at once, developers can compare and choose the best implementation for their specific needs.

## Prerequisites
- Python 3.7 or higher
- Streamlit
- Groq API access (requires API key)

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/aj47/4x-dev.git
cd 4x-dev
```

### 2. Create a virtual environment (recommended)
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up your Groq API key
You need to set your Groq API key as an environment variable. You can do this by:

- Creating a `.env` file in the project root:
```
GROQ_API_KEY=your_api_key_here
```

- Or setting it directly in your environment:
```bash
export GROQ_API_KEY=your_api_key_here  # On Windows, use: set GROQ_API_KEY=your_api_key_here
```

## Usage

1. Run the Streamlit application:
```bash
streamlit run app.py
```

2. Access the application in your web browser at the provided URL (typically http://localhost:8501)

3. Enter your web application requirements or ideas in the input form

4. Review the four different application variations generated by the Llama3-70B model

5. Copy the code or export the solutions as needed

## Features
- Parallel generation of four unique web application variations
- Powered by Groq's Llama3-70B large language model
- Interactive Streamlit interface for easy input and review
- Real-time generation and comparison

## Note
To achieve the best results, be as specific as possible when describing your application requirements. The more detailed your input, the more tailored the generated solutions will be.

