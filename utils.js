// utils.js
function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].trim() : "";
}

function extractPhone(text) {
  const match = text.match(/(\+\d{1,2}\s?)?(\d{10})/);
  return match ? match[0].trim() : "";
}

function extractName(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (
      !line.match(/\d/) &&
      line.length > 4 &&
      !line.includes("@") &&
      line.split(" ").length <= 3
    ) {
      return line;
    }
  }
  return "";
}

function extractSkills(text) {
  const techSkills = [
    "JavaScript", "Node.js", "React", "MongoDB", "Express", "Git", "Python",
    "Java", "SQL", "AWS", "Docker", "HTML", "CSS"
  ];
  return techSkills.filter((skill) => text.toLowerCase().includes(skill.toLowerCase()));
}

module.exports = {
  extractEmail,
  extractPhone,
  extractName,
  extractSkills
};
