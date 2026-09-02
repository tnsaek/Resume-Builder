const truncateText = (value, maxLength) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
};

const cleanList = (items, limit, itemMaxLength) =>
  (Array.isArray(items) ? items : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((item) => truncateText(item, itemMaxLength));

const contactItems = (profile) =>
  [profile.email, profile.phone, profile.location, profile.linkedinUrl, profile.portfolioUrl, profile.githubUrl]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

function ResumeSection({ title, children }) {
  return (
    <section className="resume-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

export default function ResumePreview({ profile, resumePoints }) {
  const tailoredPoints = cleanList(resumePoints, 5, 210);
  const skills = cleanList(profile.skills, 10, 42);
  const tools = cleanList(profile.tools, 6, 42);
  const workHistory = cleanList(profile.workHistory, 3, 260);
  const education = cleanList(profile.education, 2, 180);
  const summary = truncateText(profile.summary, 430);
  const headline = truncateText(profile.headline, 100);
  const name = String(profile.fullName || '').trim() || 'Your Name';
  const contacts = contactItems(profile);
  const hiddenItemCount =
    Math.max((Array.isArray(resumePoints) ? resumePoints.length : 0) - tailoredPoints.length, 0) +
    Math.max((Array.isArray(profile.skills) ? profile.skills.length : 0) - skills.length, 0) +
    Math.max((Array.isArray(profile.tools) ? profile.tools.length : 0) - tools.length, 0) +
    Math.max((Array.isArray(profile.workHistory) ? profile.workHistory.length : 0) - workHistory.length, 0) +
    Math.max((Array.isArray(profile.education) ? profile.education.length : 0) - education.length, 0);
  const wasTextTrimmed =
    summary !== String(profile.summary || '').trim() ||
    headline !== String(profile.headline || '').trim() ||
    tailoredPoints.some((point, index) => point !== String(resumePoints?.[index] || '').trim()) ||
    workHistory.some((item, index) => item !== String(profile.workHistory?.[index] || '').trim()) ||
    education.some((item, index) => item !== String(profile.education?.[index] || '').trim());
  const showFitNote = hiddenItemCount > 0 || wasTextTrimmed;
  const hasResumeContent = Boolean(
    headline || summary || contacts.length || tailoredPoints.length || skills.length || tools.length || workHistory.length || education.length
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <aside className="resume-preview-panel" aria-label="Resume preview">
      <div className="resume-preview-header">
        <h3>Resume preview</h3>
        <button type="button" onClick={handlePrint} disabled={!hasResumeContent}>
          Print / Save PDF
        </button>
      </div>
      {showFitNote && <p className="resume-fit-note">Preview trimmed extra content to help keep the resume to one page.</p>}

      <article className="resume-page">
        <header className="resume-header">
          <h2>{name}</h2>
          {headline && <p className="resume-headline">{headline}</p>}
          {contacts.length > 0 && <p className="resume-contact">{contacts.join(' | ')}</p>}
        </header>

        {summary && (
          <ResumeSection title="Summary">
            <p>{summary}</p>
          </ResumeSection>
        )}

        {tailoredPoints.length > 0 && (
          <ResumeSection title="Tailored Highlights">
            <ul>
              {tailoredPoints.map((point, index) => (
                <li key={`${point}-${index}`}>{point}</li>
              ))}
            </ul>
          </ResumeSection>
        )}

        {(skills.length > 0 || tools.length > 0) && (
          <ResumeSection title="Skills">
            {skills.length > 0 && <p>{skills.join(', ')}</p>}
            {tools.length > 0 && <p>Tools: {tools.join(', ')}</p>}
          </ResumeSection>
        )}

        {workHistory.length > 0 && (
          <ResumeSection title="Experience">
            <ul>
              {workHistory.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </ResumeSection>
        )}

        {education.length > 0 && (
          <ResumeSection title="Education">
            <ul>
              {education.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </ResumeSection>
        )}
      </article>
    </aside>
  );
}
