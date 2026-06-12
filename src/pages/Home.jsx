import React, { useState } from 'react'
import Navbar from '../components/Navabar'
import Select from 'react-select';
import { BsStars } from 'react-icons/bs';
import { HiOutlineCode } from 'react-icons/hi';
import Editor from '@monaco-editor/react';
import { IoCloseSharp, IoCopy } from 'react-icons/io5';
import { PiExportBold } from 'react-icons/pi';
import { ImNewTab } from 'react-icons/im';
import { FiRefreshCcw } from 'react-icons/fi';
import { GoogleGenAI } from "@google/genai";
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';

const Home = () => {

  // ✅ Fixed typos in options
  const options = [
    { value: 'html-css', label: 'HTML + CSS', lang: 'html', ext: 'html' },
    { value: 'javascript', label: 'JavaScript', lang: 'javascript', ext: 'js' },
    { value: 'react-tailwind', label: 'React + Tailwind', lang: 'javascript', ext: 'jsx' },
    { value: 'html-css-js', label: 'HTML + CSS + JS', lang: 'html', ext: 'html' },
  ];

  const [outputScreen, setOutputScreen] = useState(false);
  const [tab, setTab] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [frameWork, setFrameWork] = useState(options[0]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewTabOpen, setIsNewTabOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ Extract code safely
  function extractCode(response) {
    const match = response.match(/```(?:\w+)?\n?([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }

  // ⚠️ API Key (you said you want it inside the file)
  const ai = new GoogleGenAI({
    apiKey: "AIzaSyArxSoJxKcG0SXmtq1TP9rn0nnYBpVU5pI"
  });

  // ✅ Check if prompt technology matches selected technology
  function checkTechMismatch() {
    const lowerPrompt = prompt.toLowerCase();

    // Keywords that indicate specific technologies
    const techKeywords = {
      react: ['react', 'jsx', 'usestate', 'useeffect', 'component', 'props', 'hooks', 'redux', 'next.js', 'nextjs'],
      tailwind: ['tailwind', 'tailwindcss', 'tw-', 'className='],
      bootstrap: ['bootstrap', 'btn-primary', 'container-fluid', 'navbar-expand', 'col-md', 'col-lg', 'row'],
      vue: ['vue', 'vuejs', 'v-if', 'v-for', 'v-model', 'nuxt'],
      angular: ['angular', 'ng-', 'ngmodel', 'ngfor', 'ngif', 'typescript component'],
      javascript: ['vanilla js', 'vanilla javascript', 'pure javascript', 'pure js', 'document.createelement', 'dom manipulation'],
      jquery: ['jquery', '$.ajax', '$(document)'],
      python: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
      java: ['java ', 'spring boot', 'springboot', 'servlet', 'maven', 'gradle'],
      cpp: ['c++', 'cpp', 'c plus plus'],
      csharp: ['c#', 'csharp', '.net', 'dotnet', 'asp.net', 'blazor'],
      ruby: ['ruby', 'rails', 'ruby on rails'],
      php: ['php', 'laravel', 'symfony', 'codeigniter'],
      golang: ['golang', 'go lang'],
      rust: ['rust', 'cargo'],
      swift: ['swift', 'swiftui'],
      kotlin: ['kotlin'],
      typescript: ['typescript'],
    };

    // What each selected option should NOT contain
    const conflicts = {
      'html-css': {
        blockedTechs: ['react', 'tailwind', 'bootstrap', 'vue', 'angular', 'javascript', 'jquery', 'python', 'java', 'cpp', 'csharp', 'ruby', 'php', 'golang', 'rust', 'swift', 'kotlin', 'typescript'],
        message: 'Your prompt mentions a different technology. You selected "HTML + CSS" — please select the matching framework or update your prompt.'
      },
      'javascript': {
        blockedTechs: ['react', 'tailwind', 'bootstrap', 'vue', 'angular', 'jquery', 'python', 'java', 'cpp', 'csharp', 'ruby', 'php', 'golang', 'rust', 'swift', 'kotlin', 'typescript'],
        message: 'Your prompt mentions a different language. You selected "JavaScript" — your prompt should only describe JavaScript components. Please update your prompt or select the correct technology.'
      },
      'react-tailwind': {
        blockedTechs: ['vue', 'angular', 'bootstrap', 'html', 'jquery', 'python', 'java', 'cpp', 'csharp', 'ruby', 'php', 'golang', 'rust', 'swift', 'kotlin'],
        message: 'Your prompt mentions a different technology. You selected "React + Tailwind" — please select the matching framework or update your prompt.'
      },
      'html-css-js': {
        blockedTechs: ['react', 'tailwind', 'bootstrap', 'vue', 'angular', 'jquery', 'python', 'java', 'cpp', 'csharp', 'ruby', 'php', 'golang', 'rust', 'swift', 'kotlin', 'typescript'],
        message: 'Your prompt mentions a different technology. You selected "HTML + CSS + JS" — please select the matching framework or update your prompt.'
      },
    };

    const conflict = conflicts[frameWork.value];
    if (!conflict) return null;

    for (const tech of conflict.blockedTechs) {
      const keywords = techKeywords[tech];
      if (keywords) {
        const matchedKeyword = keywords.find(kw => lowerPrompt.includes(kw));
        if (matchedKeyword) {
          return conflict.message;
        }
      }
    }
    return null;
  }

  // ✅ Generate code with retry logic for API overload
  async function getResponse() {
    if (!prompt.trim()) return toast.error("Please describe your component first");

    // Check for tech mismatch
    const mismatchError = checkTechMismatch();
    if (mismatchError) return toast.error(mismatchError);

    const maxRetries = 3;
    const contentPrompt = `
You are an experienced programmer with expertise in web development and UI/UX design.

Generate code for: ${prompt}
Technology to use: ${frameWork.label}

STRICT RULES:
- You MUST use ONLY the technology specified above: "${frameWork.label}". Do NOT use any other framework, library, or language.
- If the technology is "HTML + CSS", use ONLY HTML and CSS. No JavaScript, no Tailwind, no Bootstrap.
- If the technology is "JavaScript", generate a pure javascript code and donot use UI for it. Focus on the functionality and logic.
- If the technology is "React + Tailwind", generate a single React component using Tailwind CSS classes. Include the necessary imports and a CDN-based setup so it runs in a single HTML file.
- If the technology is "HTML + CSS + JS", use only plain HTML, CSS, and vanilla JavaScript. No external frameworks or libraries.
- The code must be clean, well-structured, and easy to understand.
- Focus on creating a modern, animated, and responsive UI design.
- Include high-quality hover effects, shadows, animations, colors, and typography.
- Return ONLY the code, formatted properly in a Markdown fenced code block.
- Do NOT include explanations, text, comments outside the code, or anything else besides the code.
- Give the whole code in a single file.
`;

    setLoading(true);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contentPrompt,
        });

        setCode(extractCode(response.text));
        setOutputScreen(true);
        setLoading(false);
        return; // Success — exit
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);

        const isOverloaded = error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("high demand");

        if (isOverloaded && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          toast.info(`⏳ Server is busy. Retrying in ${waitTime / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (isOverloaded) {
          toast.error("🚫 The AI model is currently overloaded. Please wait a moment and try again.");
          setLoading(false);
          return;
        } else {
          toast.error("Something went wrong while generating code");
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);
  };

  // ✅ Copy Code
  const copyCode = async () => {
    if (!code.trim()) return toast.error("No code to copy");
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard");
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error("Failed to copy");
    }
  };

  // ✅ Download Code
  const downnloadFile = () => {
    if (!code.trim()) return toast.error("No code to download");

    const fileName = `GenUI-Code.${frameWork.ext || 'html'}`;
    const blob = new Blob([code], { type: 'text/plain' });
    let url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("File downloaded");
  };

  return (
    <>
      <Navbar />

      {/* ✅ Better responsive layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 lg:px-16">
        {/* Left Section */}
        <div className="w-full py-6 rounded-xl bg-[#141319] mt-5 p-5">
          <h3 className='text-[25px] font-semibold sp-text'>AI Component Generator</h3>
          <p className='text-gray-400 mt-2 text-[16px]'>Describe your component and let AI code it for you.</p>

          <p className='text-[15px] font-[700] mt-4'>Framework</p>
          <Select
            className='mt-2'
            options={options}
            value={frameWork}
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: "#111",
                borderColor: "#333",
                color: "#fff",
                boxShadow: "none",
                "&:hover": { borderColor: "#555" }
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: "#111",
                color: "#fff"
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? "#333"
                  : state.isFocused
                    ? "#222"
                    : "#111",
                color: "#fff",
                "&:active": { backgroundColor: "#444" }
              }),
              singleValue: (base) => ({ ...base, color: "#fff" }),
              placeholder: (base) => ({ ...base, color: "#aaa" }),
              input: (base) => ({ ...base, color: "#fff" })
            }}
            onChange={(selected) => setFrameWork(selected)}
          />

          <p className='text-[15px] font-[700] mt-5'>Describe your component</p>
          <textarea
            onChange={(e) => setPrompt(e.target.value)}
            value={prompt}
            className='w-full min-h-[200px] rounded-xl bg-[#09090B] mt-3 p-3 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500 resize-none'
            placeholder="Describe your component in detail and AI will generate it..."
          ></textarea>

          <div className="flex items-center justify-between mt-3">
            <p className='text-gray-400 text-sm'>Click on generate button to get your code</p>
            <button
              onClick={getResponse}
              className="flex items-center p-3 rounded-lg border-0 bg-gradient-to-r from-purple-400 to-purple-600 px-5 gap-2 transition-all hover:opacity-80 hover:scale-105 active:scale-95"
            >
              {loading ? <ClipLoader color='white' size={18} /> : <BsStars />}
              Generate
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="relative mt-2 w-full h-[80vh] bg-[#141319] rounded-xl overflow-hidden">
          {
            !outputScreen ? (
              <div className="w-full h-full flex items-center flex-col justify-center">
                <div className="p-5 w-[70px] flex items-center justify-center text-[30px] h-[70px] rounded-full bg-gradient-to-r from-purple-400 to-purple-600">
                  <HiOutlineCode />
                </div>
                <p className='text-[16px] text-gray-400 mt-3'>Your component & code will appear here.</p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="bg-[#17171C] w-full h-[50px] flex items-center gap-3 px-3">
                  <button
                    onClick={() => setTab(1)}
                    className={`w-1/2 py-2 rounded-lg transition-all ${tab === 1 ? "bg-purple-600 text-white" : "bg-zinc-800 text-gray-300"}`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setTab(2)}
                    className={`w-1/2 py-2 rounded-lg transition-all ${tab === 2 ? "bg-purple-600 text-white" : "bg-zinc-800 text-gray-300"}`}
                  >
                    Preview
                  </button>
                </div>

                {/* Toolbar */}
                <div className="bg-[#17171C] w-full h-[50px] flex items-center justify-between px-4">
                  <p className='font-bold text-gray-200'>Code Editor</p>
                  <div className="flex items-center gap-2">
                    {tab === 1 ? (
                      <>
                        <button onClick={copyCode} className="w-10 h-10 rounded-xl border border-zinc-800 flex items-center justify-center hover:bg-[#333]"><IoCopy /></button>
                        <button onClick={downnloadFile} className="w-10 h-10 rounded-xl border border-zinc-800 flex items-center justify-center hover:bg-[#333]"><PiExportBold /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setIsNewTabOpen(true)} className="w-10 h-10 rounded-xl border border-zinc-800 flex items-center justify-center hover:bg-[#333]"><ImNewTab /></button>
                        <button onClick={() => setRefreshKey(prev => prev + 1)} className="w-10 h-10 rounded-xl border border-zinc-800 flex items-center justify-center hover:bg-[#333]"><FiRefreshCcw /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* Editor / Preview */}
                <div className="h-full">
                  {tab === 1 ? (
                    <Editor value={code} height="100%" theme='vs-dark' language={frameWork.lang || 'html'} />
                  ) : (
                    <iframe key={refreshKey} srcDoc={code} className="w-full h-full bg-white text-black"></iframe>
                  )}
                </div>
              </>
            )
          }
        </div>
      </div>

      {/* ✅ Fullscreen Preview Overlay */}
      {isNewTabOpen && (
        <div className="absolute inset-0 bg-white w-screen h-screen overflow-auto">
          <div className="text-black w-full h-[60px] flex items-center justify-between px-5 bg-gray-100">
            <p className='font-bold'>Preview</p>
            <button onClick={() => setIsNewTabOpen(false)} className="w-10 h-10 rounded-xl border border-zinc-300 flex items-center justify-center hover:bg-gray-200">
              <IoCloseSharp />
            </button>
          </div>
          <iframe srcDoc={code} className="w-full h-[calc(100vh-60px)]"></iframe>
        </div>
      )}
    </>
  )
}

export default Home