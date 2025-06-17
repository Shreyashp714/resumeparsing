const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const app = express();
const port = 3000;

// MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/resumeApp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Resume schema
const Resume = mongoose.model("Resume", {
  name: String,
  email: String,
  phone: String,
  education: String,
  experience: String,
  skills: String,
});

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// UI route
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Resume Parser</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
      <div class="container py-5">
        <div class="card shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-center mb-4">Upload Resumes (ZIP)</h2>
            <form method="POST" action="/upload" enctype="multipart/form-data">
              <div class="mb-3">
                <input type="file" name="resumes" accept=".zip" class="form-control" required />
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-primary">Upload & Parse</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Upload route
app.post("/upload", upload.single("resumes"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();
    const results = [];

    if (!fs.existsSync("exports")) fs.mkdirSync("exports");

    for (const entry of entries) {
      if (entry.entryName.endsWith(".pdf")) {
        const buffer = entry.getData();
        const data = await pdfParse(buffer);

        const resumeData = {
          name: extractName(data.text),
          email: extractEmail(data.text),
          phone: extractPhone(data.text),
          education: extractEducation(data.text),
          experience: extractExperience(data.text),
          skills: extractSkills(data.text),
        };

        const saved = await new Resume(resumeData).save();
        const filePath = path.join("exports", `${saved._id}.json`);
        fs.writeFileSync(filePath, JSON.stringify({ id: saved._id, ...resumeData }, null, 2));
        results.push({ id: saved._id, ...resumeData });
      }
    }

    const html = results
      .map((r) => `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">${r.name}</h5>
            <p><strong>Email:</strong> ${r.email}</p>
            <p><strong>Phone:</strong> ${r.phone}</p>
            <p><strong>Education:</strong> ${r.education || "N/A"}</p>
            <p><strong>Experience:</strong> ${r.experience || "N/A"}</p>
            <p><strong>Skills:</strong> ${r.skills || "N/A"}</p>
            <a href="/download/${r.id}" class="btn btn-sm btn-success">Download JSON</a>
          </div>
        </div>
      `)
      .join("");

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Parsed Resumes</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container py-4">
          <h2 class="mb-4">Parsed Resumes</h2>
          ${html}
          <a href="/" class="btn btn-outline-primary">Upload More</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Download JSON route
app.get("/download/:id", (req, res) => {
  const filePath = path.join("exports", `${req.params.id}.json`);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

// ---------- Extraction Helpers ----------

function extractName(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const ignoredHeaders = [
    "RESUME",
    "CURRICULUM VITAE",
    "CV",
    "OBJECTIVE",
    "BIO DATA",
    "ABOUT ME"
  ];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toUpperCase();
    if (
      ignoredHeaders.includes(line) ||
      /\d/.test(line) ||
      line.includes("@") ||
      line.length > 40 ||
      line.split(" ").length < 2
    ) {
      continue;
    }

    return lines[i]; // Likely a name
  }

  return "";
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].trim() : "";  
}

function extractPhone(text) {
  const match = text.match(/(\+\d{1,2}\s?)?(\d{10})/);
  return match ? match[0].trim() : "";
}

function extractSection(text, sectionName) {
  const regex = new RegExp(
    `${sectionName}\\s*[:\\-]?\\s*\\n?([\\s\\S]*?)(\\n[A-Z][a-zA-Z ]{2,}|$)`,
    "i"
  );
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : "";
}

function extractEducation(text) {
  return extractSection(text, "Education|Educational Qualification|Qualification");
}

function extractExperience(text) {
  return extractSection(text, "Experience|Work Experience|Professional Experience");
}

function extractSkills(text) {
  return extractSection(text, "Skills|Technical Skills");
}

// ---------- Start Server ----------
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
