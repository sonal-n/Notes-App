"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

import { useEffect, useMemo, useState, } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import "./page.css";

import { FiHome } from "react-icons/fi";
import { LuPin, LuPinOff } from "react-icons/lu";
import { FaTag, FaTrashAlt, FaSearch,FaListUl,FaListOl } from "react-icons/fa";
import { FaNoteSticky } from "react-icons/fa6";
import { MdOutlineArrowDropDown } from "react-icons/md";

type Note = {
  _id: Id<"notes">;
  _creationTime: number;
  title: string;
  body: string;
  pinned: boolean;
  color: "yellow" | "blue" | "green" | "purple" | "gray";
  tags: string[];
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
};

export default function Page() {
  const [searchText, setSearchText] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draftTitle, setDraftTitle] = useState("");

  const notes = (useQuery(api.notes.listNotes, { searchText }) ?? []) as Note[];

  const selectedNote = useMemo<Note | null>(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => String(n._id) === selectedNoteId) ?? null;
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (selectedNoteId && !selectedNote) setSelectedNoteId(null);
  }, [selectedNoteId, selectedNote]);

  const pinnedNotes = useMemo(() => notes.filter((n) => n.pinned), [notes]);
  const otherNotes = useMemo(() => notes.filter((n) => !n.pinned), [notes]);

  const saveLabel = useMemo(() => {
    if (!selectedNote?.updatedAt) return "";
    const diff = Math.floor((Date.now() - selectedNote.updatedAt) / 1000);
    if (diff < 2) return "Saved • just now";
    if (diff < 60) return `Saved • ${diff}s ago`;
    const m = Math.floor(diff / 60);
    return `Saved • ${m}m ago`;
  }, [selectedNote?.updatedAt]);

  const createNote = useMutation(api.notes.createNote);
  const setPinned = useMutation(api.notes.setPinned);
  const setColor = useMutation(api.notes.setColor);
  const trashNote = useMutation(api.notes.trashNote);
  const updateNote = useMutation(api.notes.updateNote);

  const htmlToText = (html: string) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2]},
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Write your note...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "editor-content",
      },
    },
  });

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => forceUpdate(x => x + 1);
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    editor.on("update", refresh);

    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
      editor.off("update", refresh);
    }
  }, [editor]);

  useEffect(() => {
    if (mode !== "edit" || !editor) return;
    editor.commands.setContent(selectedNote?.body || "");
    editor.chain().focus().run();
  }, [mode, editor, selectedNote?._id]);

  return (
    <div className="container">
      <div className="side-bar">
        <h1 className="side-bar-title">Notes</h1>
        <nav className="nav-list">
          <button><span><FiHome />Home</span></button>
          <button><span><FaNoteSticky />All Notes</span></button>
          <button><span><LuPin />Pinned</span></button>
          <button><span><FaTag />Tags</span></button>
          <button><span><FaTrashAlt />Trash</span></button>
        </nav>
      </div>

      <div className="center-pane">
        {mode === "edit" && selectedNote ? (
          <div className="editor">
            <input
              className="editor-title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Title"
            />

            <div className="editor-toolbar">
              <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`tb-btn ${editor?.isActive("bold") ? "active" : ""}`}><b>B</b></button>
              <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`tb-btn ${editor?.isActive("italic") ? "active" : ""}`}><i>I</i></button>
              <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`tb-btn ${editor?.isActive("underline") ? "active" : ""}`}><u>U</u></button>
              <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`tb-btn ${editor?.isActive("heading", { level: 1 }) ? "active" : ""}`}>H1</button>
              <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`tb-btn ${editor?.isActive("heading", { level: 2 }) ? "active" : ""}`}>H2</button>
              <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`tb-btn ${editor?.isActive("bulletList") ? "active" : ""}`}><FaListUl className="list-icon"/></button>
              <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`tb-btn ${editor?.isActive("orderedList") ? "active" : ""}`}><FaListOl className="list-icon"/></button>
              <button onClick={() => editor?.chain().focus().toggleCode().run()} className={`tb-btn ${editor?.isActive("code") ? "active" : ""}`}>{"</>"}</button>
            </div>

          <div className="editor-body">
            {editor ? <EditorContent editor={editor} /> : null}
          </div>

            <div className="editor-footer">
              <div className="save-hint">{saveLabel}</div>
              <div className="actions">
                <button
                  className="primary"
                  onClick={async () => {
                    if (!selectedNote || !editor) return;
                    const html = editor.getHTML();
                    await updateNote({
                      id: selectedNote._id,
                      title: draftTitle,
                      body: html,
                    });
                    setMode("view");
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    if (!selectedNote || !editor) return;
                    editor.commands.setContent(selectedNote.body || "");
                    setDraftTitle(selectedNote.title || "");
                    
                    setMode("view");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="search-bar-wrapper">
              <div className="search-bar-container">
                <input
                  className="search-bar"
                  placeholder="Search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <span className="search-icon-inside"><FaSearch /></span>
              </div>

              {pinnedNotes.length > 0 && (
                <>
                  <h2 className="section-title">Pinned</h2>
                  <div className="notes-grid">
                    {pinnedNotes.map((n) => (
                      <button
                        className="note"
                        key={String(n._id)}
                        onClick={() => {
                          setSelectedNoteId(String(n._id));
                          setMode("view");
                        }}
                      >
                        <div className="note-title">{n.title || "Untitled"}</div>
                        <div className="note-body">{htmlToText(n.body).slice(0, 80)}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <h2 className="section-title">
                All Notes
              </h2>
              {otherNotes.length === 0 ? (
                <div className="no-notes">No notes yet. Click + to create your first note.</div>
              ) : (
                <div className="notes-grid">
                  {otherNotes.map((n) => (
                    <button
                      className="note"
                      key={String(n._id)}
                      onClick={() => {
                        setSelectedNoteId(String(n._id));
                        setMode("view");
                      }}
                    >
                      <div className="note-title">{n.title || "Untitled"}</div>
                      <div className="note-body">{htmlToText(n.body).slice(0, 80)}</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="add-btn-row"></div>
              <button
                className="add-note-btn"
                onClick={async () => {
                  const id = await createNote({ title: "Untitled", body: "", color: "yellow" });
                  setSelectedNoteId(String(id));
                  setMode("edit");
                  setDraftTitle("Untitled");
                  
                }}
                aria-label="new-note"
              >
                +
              </button>
            </div>
          </>
        )}
      </div>

      <div className="inspector">
        {!selectedNote ? (
          <div className="select-or-create">Select or create a note</div>
        ) : (
          <>
            <div className="inspector-card">
              <div className="selected-note-title-color">
                <div className="selected-note-title-row">
                  <h2 style={{ margin: 0 }}>{selectedNote.title || "Untitled"}</h2>
                  <button
                    className="pin-btn"
                    onClick={async () => {
                      await setPinned({ id: selectedNote._id, pinned: !selectedNote.pinned });
                    }}
                  >
                    {selectedNote.pinned ? <LuPin /> : <LuPinOff />}
                  </button>
                </div>

                <div className="color-row">
                  <span>Color</span>
                  <div className="select-control">
                    <select
                      className="color-select"
                      value={selectedNote.color}
                      onChange={(e) => setColor({ id: selectedNote._id, color: e.target.value as Note["color"] })}
                    >
                      <option>yellow</option>
                      <option>blue</option>
                      <option>green</option>
                      <option>purple</option>
                      <option>gray</option>
                    </select>
                    <MdOutlineArrowDropDown className="select-icon" aria-hidden />
                  </div>
                </div>
              </div>

              {mode === "view" && (
                <div className="edit-row">
                  <button
                    className="edit-btn"
                    onClick={() => {
                      setMode("edit");
                      setDraftTitle(selectedNote.title || "");
                      
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {mode === "view" && (
              <div className="selected-note-body" dangerouslySetInnerHTML={{__html: selectedNote.body || ""}}>
              </div>
            )}

            <button
              className="delete-btn"
              onClick={async () => {
                const ok = confirm("Move this note to trash?");
                if (!ok) return;
                await trashNote({ id: selectedNote._id, trashed: true });
                setSelectedNoteId(null);
                setMode("view");
              }}
              aria-label="Move to Trash"
              title="Move to Trash"
            >
              <FaTrashAlt />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
