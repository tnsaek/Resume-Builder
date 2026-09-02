import { useEffect, useState } from 'react';
import FormMessage from './FormMessage';

export default function SavedDraftsList({
  drafts,
  onLoadDrafts,
  onOpenDraft,
  onRenameDraft,
  onDeleteDraft,
  isLoadingDrafts,
  isOpeningDraft,
  isRenamingDraft,
  isDeletingDraft,
  message,
  renameMessage
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  useEffect(() => {
    onLoadDrafts();
  }, [onLoadDrafts]);

  const startRename = (draft) => {
    setEditingId(draft.id);
    setEditingTitle(draft.title);
    setConfirmingDeleteId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveRename = async (draftId) => {
    const renamed = await onRenameDraft(draftId, editingTitle);
    if (!renamed) return;
    cancelRename();
  };

  const deleteDraft = async (draftId) => {
    const deleted = await onDeleteDraft(draftId);
    if (deleted && editingId === draftId) cancelRename();
    if (deleted) setConfirmingDeleteId(null);
  };

  return (
    <section className="saved-card">
      <div className="profile-header">
        <h2>Saved</h2>
        <button type="button" className="secondary" onClick={onLoadDrafts} disabled={isLoadingDrafts}>
          {isLoadingDrafts ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <FormMessage message={message} />

      {drafts.length ? (
        <div className="draft-list">
          {drafts.map((draft) => (
            <article className="draft-list-item" key={draft.id}>
              {editingId === draft.id ? (
                <div className="draft-rename-form">
                  <label htmlFor={`draft-title-${draft.id}`}>Draft title</label>
                  <FormMessage message={renameMessage} />
                  <input
                    id={`draft-title-${draft.id}`}
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    disabled={isRenamingDraft}
                  />
                </div>
              ) : (
                <div>
                  <h3>{draft.title}</h3>
                  <p>Updated {new Date(draft.updatedAt).toLocaleString()}</p>
                </div>
              )}
              <div className="draft-actions">
                {editingId === draft.id ? (
                  <>
                    <button type="button" onClick={() => saveRename(draft.id)} disabled={isRenamingDraft || !editingTitle.trim()}>
                      {isRenamingDraft ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" className="secondary" onClick={cancelRename} disabled={isRenamingDraft}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => onOpenDraft(draft.id)} disabled={isOpeningDraft}>
                      {isOpeningDraft ? 'Opening...' : 'Open'}
                    </button>
                    <button type="button" className="secondary" onClick={() => startRename(draft)} disabled={isRenamingDraft}>
                      Rename
                    </button>
                    {confirmingDeleteId === draft.id ? (
                      <>
                        <button type="button" className="danger" onClick={() => deleteDraft(draft.id)} disabled={isDeletingDraft}>
                          {isDeletingDraft ? 'Deleting...' : 'Confirm delete'}
                        </button>
                        <button type="button" className="secondary" onClick={() => setConfirmingDeleteId(null)} disabled={isDeletingDraft}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => setConfirmingDeleteId(draft.id)}
                        disabled={isDeletingDraft}
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">No saved drafts yet.</p>
      )}
    </section>
  );
}
