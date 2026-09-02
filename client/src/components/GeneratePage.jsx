import { useEffect, useState } from 'react';
import FormMessage from './FormMessage';
import ResumePreview from './ResumePreview';

const initialDraft = {
  id: null,
  title: '',
  resumePoints: [],
  coverLetter: ''
};

export default function GeneratePage({ openedDraft, profile, canGenerate, onGenerate, onSaveDraft, isGenerating, isSavingDraft, generateMessage, saveMessage }) {
  const [jobPost, setJobPost] = useState('');
  const [draft, setDraft] = useState(initialDraft);
  const [remainingGenerationsToday, setRemainingGenerationsToday] = useState(null);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    if (!openedDraft) return;

    setJobPost(openedDraft.jobPost || '');
    setDraft({
      id: openedDraft.id || null,
      title: openedDraft.title || '',
      resumePoints: Array.isArray(openedDraft.resumePoints) ? openedDraft.resumePoints : [],
      coverLetter: openedDraft.coverLetter || ''
    });
    setSavedAt(openedDraft.updatedAt ? new Date(openedDraft.updatedAt).toLocaleString() : '');
    setRemainingGenerationsToday(null);
  }, [openedDraft]);

  const handleGenerate = async (event) => {
    event.preventDefault();
    const generated = await onGenerate(jobPost);
    if (!generated) return;

    setDraft({
      id: null,
      title: draft.title,
      resumePoints: Array.isArray(generated.resumePoints) ? generated.resumePoints : [],
      coverLetter: generated.coverLetter || ''
    });
    setSavedAt('');
    setRemainingGenerationsToday(
      Number.isInteger(generated.remainingGenerationsToday) ? generated.remainingGenerationsToday : null
    );
  };

  const handleSave = async () => {
    const savedDraft = await onSaveDraft({
      id: draft.id,
      title: draft.title,
      jobPost,
      resumePoints: draft.resumePoints,
      coverLetter: draft.coverLetter
    });
    if (!savedDraft) return;

    setDraft((current) => ({
      ...current,
      id: savedDraft.id,
      title: savedDraft.title
    }));
    setSavedAt(new Date(savedDraft.updatedAt).toLocaleString());
  };

  const updateResumePoints = (value) => {
    setDraft((current) => ({
      ...current,
      resumePoints: value.split('\n')
    }));
  };

  return (
    <div className="generate-layout">
      <section className="generate-card">
        <div className="profile-header">
          <h2>Generate</h2>
        </div>
        {!canGenerate && <p className="flow-note">Save your profile before generating a resume.</p>}

        <form onSubmit={handleGenerate}>
          <div className="form-section first-section">
            <h3>Job post</h3>
            <FormMessage message={generateMessage} />
            <label htmlFor="draftTitle">Draft title</label>
            <input
              id="draftTitle"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Junior Full-Stack Developer at Example Co."
            />

            <label htmlFor="jobPost">Paste job post</label>
            <textarea
              id="jobPost"
              className="job-post-input"
              value={jobPost}
              onChange={(event) => setJobPost(event.target.value)}
              placeholder="Paste the full job description here."
              required
            />
          </div>

          <div className="controls">
            <button type="submit" disabled={isGenerating || !canGenerate || !jobPost.trim()}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {remainingGenerationsToday !== null && (
            <p className="usage-note">{remainingGenerationsToday} generations remaining today.</p>
          )}
        </form>

        <div className="form-section">
          <h3>Resume points</h3>
          <label htmlFor="resumePoints">Editable resume points</label>
          <textarea
            id="resumePoints"
            rows="8"
            value={draft.resumePoints.join('\n')}
            onChange={(event) => updateResumePoints(event.target.value)}
            placeholder="Generated resume bullets will appear here."
          />
        </div>

        <div className="form-section">
          <h3>Cover letter</h3>
          <label htmlFor="coverLetter">Editable cover letter</label>
          <textarea
            id="coverLetter"
            rows="12"
            value={draft.coverLetter}
            onChange={(event) => setDraft((current) => ({ ...current, coverLetter: event.target.value }))}
            placeholder="Generated cover letter will appear here."
          />
        </div>

        <div className="draft-save-bar">
          <div>
            {draft.id ? <strong>Saved draft #{draft.id}</strong> : <strong>Unsaved draft</strong>}
            {savedAt && <p className="usage-note">Last saved {savedAt}</p>}
            <FormMessage message={saveMessage} />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSavingDraft || !jobPost.trim() || (!draft.resumePoints.length && !draft.coverLetter.trim())}
          >
            {isSavingDraft ? 'Saving...' : 'Save draft'}
          </button>
        </div>
      </section>

      <ResumePreview profile={profile} resumePoints={draft.resumePoints} />
    </div>
  );
}
