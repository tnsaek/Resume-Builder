import FormMessage from './FormMessage';

export default function ProfileForm({ profile, setProfile, onSave, isLoading, message }) {
  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updateArrayField = (field, value) => {
    setProfile((current) => ({
      ...current,
      [field]: value.split('\n')
    }));
  };

  const updatePreferenceField = (field, value) => {
    setProfile((current) => ({
      ...current,
      jobPreferences: {
        ...current.jobPreferences,
        [field]: value
      }
    }));
  };

  const updatePreferenceArrayField = (field, value) => {
    updatePreferenceField(field, value.split('\n'));
  };

  return (
    <section className="profile-card">
      <div className="profile-header">
        <h2>Your profile</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onSave} disabled={isLoading}>
            Save profile
          </button>
        </div>
      </div>
      <FormMessage message={message} />

      <div className="form-section">
        <h3>Contact</h3>
        <div className="field-grid">
          <div>
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" value={profile.fullName} onChange={(event) => updateField('fullName', event.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={profile.email} onChange={(event) => updateField('email', event.target.value)} placeholder="jane@example.com" />
          </div>
          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+1 555 123 4567" />
          </div>
          <div>
            <label htmlFor="location">Location</label>
            <input id="location" value={profile.location} onChange={(event) => updateField('location', event.target.value)} placeholder="New York, NY" />
          </div>
          <div>
            <label htmlFor="linkedinUrl">LinkedIn</label>
            <input id="linkedinUrl" value={profile.linkedinUrl} onChange={(event) => updateField('linkedinUrl', event.target.value)} placeholder="https://linkedin.com/in/janedoe" />
          </div>
          <div>
            <label htmlFor="portfolioUrl">Portfolio</label>
            <input id="portfolioUrl" value={profile.portfolioUrl} onChange={(event) => updateField('portfolioUrl', event.target.value)} placeholder="https://janedoe.com" />
          </div>
          <div>
            <label htmlFor="githubUrl">GitHub</label>
            <input id="githubUrl" value={profile.githubUrl} onChange={(event) => updateField('githubUrl', event.target.value)} placeholder="https://github.com/janedoe" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Professional summary</h3>
        <label htmlFor="headline">Headline</label>
        <input id="headline" value={profile.headline} onChange={(event) => updateField('headline', event.target.value)} placeholder="Product manager with resume-building experience" />

        <label htmlFor="summary">Summary</label>
        <textarea id="summary" rows="5" value={profile.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder="Write a concise professional summary focused on your strongest experience, scope, and outcomes." />
      </div>

      <div className="form-section">
        <h3>Experience</h3>
        <label htmlFor="workHistory">Work history and responsibilities</label>
        <textarea id="workHistory" rows="7" value={profile.workHistory.join('\n')} onChange={(event) => updateArrayField('workHistory', event.target.value)} placeholder={'Senior product manager, Example Inc., 2021-present: Led roadmap for B2B SaaS platform; increased activation by 18%.\nOperations lead, Another Co., 2018-2021: Managed cross-functional process improvements across 4 teams.'} />

        <label htmlFor="achievements">Measurable achievements</label>
        <textarea id="achievements" rows="5" value={profile.achievements.join('\n')} onChange={(event) => updateArrayField('achievements', event.target.value)} placeholder={'Reduced onboarding time by 35% through workflow redesign.\nManaged $500K annual budget with no overrun.'} />
      </div>

      <div className="form-section">
        <h3>Skills</h3>
        <div className="field-grid">
          <div>
            <label htmlFor="skills">Skills</label>
            <textarea id="skills" rows="6" value={profile.skills.join('\n')} onChange={(event) => updateArrayField('skills', event.target.value)} placeholder={'JavaScript\nProduct strategy\nTeam leadership'} />
          </div>
          <div>
            <label htmlFor="tools">Tools and platforms</label>
            <textarea id="tools" rows="6" value={profile.tools.join('\n')} onChange={(event) => updateArrayField('tools', event.target.value)} placeholder={'Salesforce\nFigma\nPostgreSQL\nGoogle Analytics'} />
          </div>
          <div>
            <label htmlFor="languages">Languages</label>
            <textarea id="languages" rows="4" value={profile.languages.join('\n')} onChange={(event) => updateArrayField('languages', event.target.value)} placeholder={'English - fluent\nSpanish - professional'} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Education and credentials</h3>
        <label htmlFor="education">Education</label>
        <textarea id="education" rows="5" value={profile.education.join('\n')} onChange={(event) => updateArrayField('education', event.target.value)} placeholder={'B.S. Computer Science, Example University, 2017\nCoursework: Data structures, UX research, statistics'} />

        <label htmlFor="certifications">Certifications</label>
        <textarea id="certifications" rows="4" value={profile.certifications.join('\n')} onChange={(event) => updateArrayField('certifications', event.target.value)} placeholder={'Certified Scrum Product Owner, 2023\nAWS Cloud Practitioner, 2022'} />
      </div>

      <div className="form-section">
        <h3>Additional evidence</h3>
        <label htmlFor="projects">Projects</label>
        <textarea id="projects" rows="5" value={profile.projects.join('\n')} onChange={(event) => updateArrayField('projects', event.target.value)} placeholder={'Resume builder app: Designed profile storage, auth, and tailored document generation workflow.'} />

        <label htmlFor="volunteerWork">Volunteer work</label>
        <textarea id="volunteerWork" rows="4" value={profile.volunteerWork.join('\n')} onChange={(event) => updateArrayField('volunteerWork', event.target.value)} placeholder={'Mentor, local workforce nonprofit: Reviewed resumes and coached job seekers.'} />
      </div>

      <div className="form-section">
        <h3>Target role</h3>
        <div className="field-grid">
          <div>
            <label htmlFor="targetRoles">Target roles</label>
            <textarea id="targetRoles" rows="4" value={profile.jobPreferences.targetRoles.join('\n')} onChange={(event) => updatePreferenceArrayField('targetRoles', event.target.value)} placeholder={'Product Manager\nProgram Manager'} />
          </div>
          <div>
            <label htmlFor="targetIndustries">Target industries</label>
            <textarea id="targetIndustries" rows="4" value={profile.jobPreferences.targetIndustries.join('\n')} onChange={(event) => updatePreferenceArrayField('targetIndustries', event.target.value)} placeholder={'Climate tech\nHealthcare\nEducation'} />
          </div>
          <div>
            <label htmlFor="preferredLocations">Preferred locations</label>
            <textarea id="preferredLocations" rows="4" value={profile.jobPreferences.preferredLocations.join('\n')} onChange={(event) => updatePreferenceArrayField('preferredLocations', event.target.value)} placeholder={'Remote\nNew York, NY\nWashington, DC'} />
          </div>
          <div>
            <label htmlFor="workModes">Work modes</label>
            <textarea id="workModes" rows="4" value={profile.jobPreferences.workModes.join('\n')} onChange={(event) => updatePreferenceArrayField('workModes', event.target.value)} placeholder={'Remote\nHybrid\nFull-time'} />
          </div>
          <div>
            <label htmlFor="salaryExpectation">Salary expectation</label>
            <input id="salaryExpectation" value={profile.jobPreferences.salaryExpectation} onChange={(event) => updatePreferenceField('salaryExpectation', event.target.value)} placeholder="$120K-$140K" />
          </div>
          <div>
            <label htmlFor="availability">Availability</label>
            <input id="availability" value={profile.availability} onChange={(event) => updateField('availability', event.target.value)} placeholder="Available with two weeks notice" />
          </div>
          <div>
            <label htmlFor="workAuthorization">Work authorization</label>
            <input id="workAuthorization" value={profile.workAuthorization} onChange={(event) => updateField('workAuthorization', event.target.value)} placeholder="Authorized to work in the United States" />
          </div>
        </div>

        <label htmlFor="preferenceNotes">Search notes</label>
        <textarea id="preferenceNotes" rows="4" value={profile.jobPreferences.notes} onChange={(event) => updatePreferenceField('notes', event.target.value)} placeholder="Constraints, deal-breakers, relocation preferences, or context to consider when tailoring documents." />
      </div>
    </section>
  );
}
