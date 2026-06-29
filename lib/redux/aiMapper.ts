import type { Resume } from "lib/redux/types";

export function mapBuildResumeToOpenResume(ai: any): Resume {
  const profile = {
    name: ai.name || "",
    email: ai.email || "",
    phone: ai.phone || "",
    location: ai.location || "",
    url: ai.linkedin || ai.github || ai.website || "",
    summary: ai.summary || "",
  };

  const workExperiences = (ai.experience || []).map((exp: any) => ({
    company: exp.company || "",
    jobTitle: exp.role || "",
    date: exp.duration || "",
    descriptions: Array.isArray(exp.points) ? exp.points : [],
  }));

  const educations = (ai.education || []).map((edu: any) => ({
    school: edu.institution || "",
    degree: edu.degree || "",
    date: edu.year || "",
    gpa: edu.gpa || "",
    descriptions: [],
  }));

  const projects = (ai.projects || []).map((proj: any) => ({
    project: proj.name || "",
    date: proj.duration || "",
    descriptions: proj.description ? [proj.description] : [],
  }));

  // Limit featured skills to 6 as defined in open-resume's initial store
  const techSkills = ai.skills?.technical || [];
  const toolsSkills = ai.skills?.tools || [];

  const featuredSkills = techSkills.slice(0, 6).map((skill: string) => ({
    skill: skill || "",
    rating: 4,
  }));

  // Fill in empty slots if less than 6 featured skills
  while (featuredSkills.length < 6) {
    featuredSkills.push({ skill: "", rating: 4 });
  }

  const skillDescriptions = [
    techSkills.slice(6).join(", "),
    toolsSkills.join(", "),
  ].filter(Boolean);

  const skills = {
    featuredSkills,
    descriptions: skillDescriptions,
  };

  const custom = {
    descriptions: [
      ...(ai.certifications || []).map((c: string) => `Certification: ${c}`),
      ...(ai.achievements || []).map((a: string) => `Achievement: ${a}`),
      ...(ai.languages || []).map((l: string) => `Language: ${l}`),
      ai.interests?.length ? `Interests: ${ai.interests.join(", ")}` : "",
    ].filter(Boolean),
  };

  return {
    profile,
    workExperiences,
    educations,
    projects,
    skills,
    custom,
  };
}
