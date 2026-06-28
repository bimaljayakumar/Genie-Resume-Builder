"""
render_resume.py
Reads a resume JSON from stdin, builds a RenderCV YAML, renders to PDF,
and writes the raw PDF bytes to stdout.
"""
import json
import pathlib
import sys
import tempfile


def safe(val, fallback=""):
    if not val:
        return fallback
    return str(val).strip()


def build_yaml(data: dict) -> str:
    lines = []

    name     = safe(data.get("name"), "Resume")
    headline = safe(data.get("title"))
    email    = safe(data.get("email"))
    phone    = safe(data.get("phone"))
    location = safe(data.get("location"))
    linkedin = safe(data.get("linkedin"))
    github   = safe(data.get("github"))
    website  = safe(data.get("website"))

    lines.append("cv:")
    lines.append(f"  name: {json.dumps(name)}")
    if headline:
        lines.append(f"  headline: {json.dumps(headline)}")
    if location:
        lines.append(f"  location: {json.dumps(location)}")
    if email:
        lines.append(f"  email: {json.dumps(email)}")
    if phone:
        p = phone.replace(" ", "").replace("-", "")
        if not p.startswith("+"):
            p = "+91" + p.lstrip("0")
        lines.append(f"  phone: {json.dumps(p)}")
    if website:
        lines.append(f"  website: {json.dumps(website)}")

    social = []
    if linkedin:
        username = linkedin.rstrip("/").split("/")[-1]
        if username and username.lower() != "linkedin.com":
            social.append(("LinkedIn", username))
    if github:
        username = github.rstrip("/").split("/")[-1]
        if username and username.lower() != "github.com":
            social.append(("GitHub", username))
    if social:
        lines.append("  social_networks:")
        for network, username in social:
            lines.append(f"    - network: {network}")
            lines.append(f"      username: {json.dumps(username)}")

    lines.append("  sections:")

    # Summary
    summary = safe(data.get("summary"))
    if summary:
        lines.append("    summary:")
        lines.append(f"      - {json.dumps(summary)}")

    # Education
    education = data.get("education") or []
    if education:
        lines.append("    education:")
        for edu in education:
            degree      = safe(edu.get("degree"), "Degree")
            institution = safe(edu.get("institution"), "Institution")
            area        = safe(edu.get("area") or edu.get("degree", ""))
            year        = safe(edu.get("year"))
            gpa         = safe(edu.get("gpa"))
            loc         = safe(edu.get("location"))

            start_date = end_date = date_val = None
            if year:
                if ("–" in year or "-" in year) and not year.startswith("-"):
                    sep = "–" if "–" in year else "-"
                    parts = year.split(sep, 1)
                    s = parts[0].strip()
                    e = parts[1].strip()
                    if s:
                        start_date = s
                        end_date   = "present" if e.lower() in ("present", "current", "ongoing", "") else e
                    else:
                        date_val = year
                else:
                    date_val = year

            lines.append(f"      - institution: {json.dumps(institution)}")
            lines.append(f"        area: {json.dumps(area)}")
            lines.append(f"        degree: {json.dumps(degree)}")
            if start_date:
                lines.append(f"        start_date: {json.dumps(start_date)}")
                lines.append(f"        end_date: {json.dumps(end_date)}")
            elif date_val:
                lines.append(f"        date: {json.dumps(date_val)}")
            if loc:
                lines.append(f"        location: {json.dumps(loc)}")
            highlights = []
            if gpa:
                highlights.append(f"Grade: {gpa}")
            if highlights:
                lines.append("        highlights:")
                for h in highlights:
                    lines.append(f"          - {json.dumps(h)}")

    # Experience
    experience = data.get("experience") or []
    if experience:
        lines.append("    experience:")
        for exp in experience:
            company  = safe(exp.get("company"), "Company")
            role     = safe(exp.get("role") or exp.get("position"), "Role")
            duration = safe(exp.get("duration") or exp.get("date"))
            loc      = safe(exp.get("location"))
            points   = exp.get("points") or []

            start_date = end_date = date_val = None
            if duration:
                for sep in (" - ", " – ", " — ", "-"):
                    if sep in duration:
                        parts = duration.split(sep, 1)
                        s = parts[0].strip()
                        e = parts[1].strip()
                        if s:
                            start_date = s
                            end_date   = "present" if e.lower() in ("present", "current", "now", "") else e
                        break
                else:
                    date_val = duration

            lines.append(f"      - company: {json.dumps(company)}")
            lines.append(f"        position: {json.dumps(role)}")
            if start_date:
                lines.append(f"        start_date: {json.dumps(start_date)}")
                lines.append(f"        end_date: {json.dumps(end_date)}")
            elif date_val:
                lines.append(f"        date: {json.dumps(date_val)}")
            if loc:
                lines.append(f"        location: {json.dumps(loc)}")
            if points:
                lines.append("        highlights:")
                for p in points:
                    lines.append(f"          - {json.dumps(safe(p))}")

    # Projects
    projects = data.get("projects") or []
    if projects:
        lines.append("    projects:")
        for proj in projects:
            pname = safe(proj.get("name"), "Project")
            tech  = safe(proj.get("tech"))
            desc  = safe(proj.get("description"))
            link  = safe(proj.get("link"))
            display_name = f"[{pname}]({link})" if link else pname
            lines.append(f"      - name: {json.dumps(display_name)}")
            if tech:
                lines.append(f"        summary: {json.dumps(tech)}")
            if desc:
                lines.append("        highlights:")
                lines.append(f"          - {json.dumps(desc)}")

    # Skills
    skills_data = data.get("skills") or {}
    skill_lines = []
    if isinstance(skills_data, dict):
        tech  = skills_data.get("technical") or []
        tools = skills_data.get("tools") or []
        if tech:
            skill_lines.append(("Technical Skills", ", ".join(tech)))
        if tools:
            skill_lines.append(("Tools & Platforms", ", ".join(tools)))
    elif isinstance(skills_data, list) and skills_data:
        skill_lines.append(("Skills", ", ".join(skills_data)))

    if skill_lines:
        lines.append("    skills:")
        for label, details in skill_lines:
            lines.append(f"      - label: {json.dumps(label)}")
            lines.append(f"        details: {json.dumps(details)}")

    # Certifications
    certs = data.get("certifications") or []
    if certs:
        lines.append("    certifications:")
        for c in certs:
            lines.append(f"      - bullet: {json.dumps(safe(c))}")

    # Achievements
    achievements = data.get("achievements") or []
    if achievements:
        lines.append("    achievements:")
        for a in achievements:
            lines.append(f"      - bullet: {json.dumps(safe(a))}")

    # Languages + Interests
    languages = data.get("languages") or []
    interests = data.get("interests") or []
    if languages or interests:
        lines.append("    languages and interests:")
        if languages:
            lines.append(f"      - label: {json.dumps('Languages')}")
            lines.append(f"        details: {json.dumps(', '.join(languages))}")
        if interests:
            lines.append(f"      - label: {json.dumps('Interests')}")
            lines.append(f"        details: {json.dumps(', '.join(interests))}")

    lines.append("design:")
    lines.append("  theme: classic")
    lines.append("locale:")
    lines.append("  language: english")

    return "\n".join(lines) + "\n"


def name_to_snake(name: str) -> str:
    return "_".join(name.strip().split())


def main():
    raw = sys.stdin.buffer.read()
    try:
        data = json.loads(raw)
    except Exception as e:
        sys.stderr.write(f"JSON parse error: {e}\n")
        sys.exit(1)

    yaml_content = build_yaml(data)

    with tempfile.TemporaryDirectory(prefix="rendercv_") as tmpdir:
        tmp = pathlib.Path(tmpdir)
        out = tmp / "output"
        out.mkdir()

        safe_name = name_to_snake(data.get("name", "Resume"))
        pdf_path  = out / f"{safe_name}_CV.pdf"
        typ_path  = out / f"{safe_name}_CV.typ"

        try:
            from rendercv.schema.rendercv_model_builder import build_rendercv_dictionary_and_model
            from rendercv.renderer.typst import generate_typst
            from rendercv.renderer.pdf_png import generate_pdf
        except ImportError as e:
            sys.stderr.write(f"Import error: {e}\n")
            sys.exit(2)

        try:
            _, model = build_rendercv_dictionary_and_model(
                yaml_content,
                input_file_path=None,
                output_folder=str(out),
                typst_path=str(typ_path),
                pdf_path=str(pdf_path),
                dont_generate_png=True,
                dont_generate_markdown=True,
                dont_generate_html=True,
            )

            typst_file = generate_typst(model)
            final_pdf  = generate_pdf(model, typst_file)

            if final_pdf and final_pdf.exists():
                sys.stdout.buffer.write(final_pdf.read_bytes())
            else:
                sys.stderr.write("PDF was not generated.\n")
                sys.exit(3)

        except Exception as e:
            import traceback
            sys.stderr.write(f"Render error: {e}\n{traceback.format_exc()}\n")
            sys.exit(4)


if __name__ == "__main__":
    main()
