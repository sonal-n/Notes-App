"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import "./page.css";

import { FiHome } from "react-icons/fi";
import { LuPin, LuPinOff } from "react-icons/lu";
import {
  FaTag,
  FaTrashAlt,
  FaSearch,
  FaListUl,
  FaListOl,
} from "react-icons/fa";
import { FaNoteSticky } from "react-icons/fa6";
import { MdOutlineArrowDropDown } from "react-icons/md";

type Note = {
  _id: Id<"notes">;
  _creationTime: number;
  title: string;
  body: string;
  pinned: boolean;
  color: "yellow" | "blue" | "green" | "purple" | "gray";
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
};

export default function Page() {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchText);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draftTitle, setDraftTitle] = useState("");
  const [tab, setTab] = useState<"all" | "pinned" | "trash">("all");
  const titleRef = useRef<HTMLInputElement>(null);
  const [focusTarget, setFocusTarget] = useState<"title" | "body">("body");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchText), 250);
    return () => clearTimeout(id);
  }, [searchText]);

  const nonTrashed =
    useQuery(
      api.notes.listNotes,
      tab === "trash" ? "skip" : { searchText: debouncedSearch }
    ) ?? [];

  const trashed =
    useQuery(api.notes.listTrashed, tab === "trash" ? {} : "skip") ?? [];

  const notes = (tab === "trash" ? trashed : nonTrashed) as Note[];

  const selectedNote = useMemo<Note | null>(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => String(n._id) === selectedNoteId) ?? null;
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (selectedNoteId && !selectedNote) setSelectedNoteId(null);
  }, [selectedNoteId, selectedNote]);

  const pinnedNotes = useMemo(() => {
    if (tab !== "all") return [];
    return notes.filter((n) => n.pinned);
  }, [notes, tab]);

  const otherNotes = useMemo(() => {
    switch (tab) {
      case "all":
        return notes.filter((n) => !n.pinned);
      case "pinned":
        return notes.filter((n) => n.pinned);
      default:
        return notes;
    }
  }, [notes, tab]);

  const saveLabel = useMemo(() => {
    if (!selectedNote?.updatedAt) return "";
    const diff = Math.floor((Date.now() - selectedNote.updatedAt) / 1000);
    if (diff < 2) return "Saved • just now";
    if (diff < 60) return `Saved • ${diff}s ago`;
    const m = Math.floor(diff / 60);
    return `Saved • ${m}m ago`;
  }, [selectedNote?.updatedAt]);

  const sectionTitle = useMemo(() => {
    switch (tab) {
      case "pinned":
        return "Pinned";
      case "trash":
        return "Trash";
      default:
        return "All Notes";
    }
  }, [tab]);

  const createNote = useMutation(api.notes.createNote);
  const setPinned = useMutation(api.notes.setPinned);
  const setColor = useMutation(api.notes.setColor);
  const trashNote = useMutation(api.notes.trashNote);
  const updateNote = useMutation(api.notes.updateNote);
  const restoreNote = useMutation(api.notes.restoreNote);
  const deleteForever = useMutation(api.notes.deleteForever);

  const htmlToText = (html: string) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
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

  const refresh = useCallback(() => {
    forceUpdate((x) => x + 1);
  }, []);

  useEffect(() => {
    if (!editor) return;
    editor.on("update", refresh);
    editor.on("selectionUpdate", refresh);
    return () => {
      editor.off("update", refresh);
      editor.off("selectionUpdate", refresh);
    };
  }, [editor, refresh]);

  useEffect(() => {
    if (!editor || mode !== "edit") return;
    editor.commands.setContent(selectedNote?.body || "");
    if (focusTarget === "body") {
      editor.chain().focus().run();
    } else {
      setTimeout(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
      });
    }
  }, [mode, editor, selectedNote?._id, focusTarget]);

  return (
    <div className="container">
      <div className="side-bar">
        <h1 className="side-bar-title">Notes</h1>
        <nav className="nav-list">
          <button onClick={() => setTab("all")}>
            <span>
              <FiHome />
              Home
            </span>
          </button>
          <button onClick={() => setTab("all")}>
            <span>
              <FaNoteSticky />
              All Notes
            </span>
          </button>
          <button onClick={() => setTab("pinned")}>
            <span>
              <LuPin />
              Pinned
            </span>
          </button>
          <button onClick={() => setTab("trash")}>
            <span>
              <FaTrashAlt />
              Trash
            </span>
          </button>
        </nav>
      </div>

      <div className="center-pane">
        {tab !== "trash" && mode === "edit" && selectedNote ? (
          <div className="editor">
            <input
              ref={titleRef}
              className="editor-title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Title"
              autoFocus={focusTarget === "title"}
            />

            <div className="editor-toolbar">
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={`tb-btn ${editor?.isActive("bold") ? "active" : ""}`}
              >
                <b>B</b>
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={`tb-btn ${editor?.isActive("italic") ? "active" : ""}`}
              >
                <i>I</i>
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={`tb-btn ${editor?.isActive("underline") ? "active" : ""}`}
              >
                <u>U</u>
              </button>
              <button
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 1 }).run()
                }
                className={`tb-btn ${editor?.isActive("heading", { level: 1 }) ? "active" : ""}`}
              >
                H1
              </button>
              <button
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run()
                }
                className={`tb-btn ${editor?.isActive("heading", { level: 2 }) ? "active" : ""}`}
              >
                H2
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={`tb-btn ${editor?.isActive("bulletList") ? "active" : ""}`}
              >
                <FaListUl className="list-icon" />
              </button>
              <button
                onClick={() =>
                  editor?.chain().focus().toggleOrderedList().run()
                }
                className={`tb-btn ${editor?.isActive("orderedList") ? "active" : ""}`}
              >
                <FaListOl className="list-icon" />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleCode().run()}
                className={`tb-btn ${editor?.isActive("code") ? "active" : ""}`}
              >
                {"</>"}
              </button>
            </div>

            <div className="editor-body">
              {editor ? <EditorContent editor={editor} /> : null}
            </div>

            <div className="editor-footer">
              <div className="save-hint">{saveLabel}</div>
              <div className="actions">
                <button
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
                <span className="search-icon-inside">
                  <FaSearch />
                </span>
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
                        <div className="note-head">
                          <span className={`color-dot color-dot--${n.color}`} />
                          <div className="note-title">
                            {n.title || "Untitled"}
                          </div>
                        </div>
                        <div className="note-body">
                          {htmlToText(n.body).slice(0, 80)}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <h2 className="section-title">{sectionTitle}</h2>
              {otherNotes.length === 0 ? (
                <div className="no-notes">
                  {tab === "trash"
                    ? "Trash is empty."
                    : tab === "pinned"
                      ? "No pinned notes."
                      : "No notes yet. Click + to create your first note."}
                </div>
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
                      <div className="note-head">
                        <span className={`color-dot color-dot--${n.color}`} />
                        <div className="note-title">
                          {n.title || "Untitled"}
                        </div>
                      </div>
                      <div className="note-body">
                        {htmlToText(n.body).slice(0, 80)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="add-btn-row"></div>
              {tab !== "trash" && (
                <>
                  <button
                    className="add-note-btn"
                    onClick={async () => {
                      const id = await createNote({
                        title: "Untitled",
                        body: "",
                        color: "yellow",
                      });
                      setSelectedNoteId(String(id));
                      setMode("edit");
                      setDraftTitle("Untitled");
                      setFocusTarget("title");
                    }}
                    aria-label="new-note"
                  >
                    +
                  </button>
                </>
              )}
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
              {tab !== "trash" ? (
                <>
                  <div className="selected-note-title-color">
                    <div className="selected-note-title-row">
                      <h2 style={{ margin: 0 }}>
                        {selectedNote.title || "Untitled"}
                      </h2>
                      <button
                        className="pin-btn"
                        onClick={async () => {
                          await setPinned({
                            id: selectedNote._id,
                            pinned: !selectedNote.pinned,
                          });
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
                          onChange={(e) =>
                            setColor({
                              id: selectedNote._id,
                              color: e.target.value as Note["color"],
                            })
                          }
                        >
                          <option>yellow</option>
                          <option>blue</option>
                          <option>green</option>
                          <option>purple</option>
                          <option>gray</option>
                        </select>
                        <MdOutlineArrowDropDown
                          className="select-icon"
                          aria-hidden
                        />
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
                          setFocusTarget("title");
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 style={{ margin: 0 }}>
                    {selectedNote.title || "Untitled"}
                  </h2>
                  <div className="edit-row">
                    <button
                      className="primary"
                      onClick={async () => {
                        await restoreNote({ id: selectedNote._id });
                        setSelectedNoteId(null);
                      }}
                    >
                      Restore
                    </button>
                    <button
                      className="danger"
                      onClick={async () => {
                        const ok = confirm(
                          "Delete this note forever? This cannot be undone."
                        );
                        if (!ok) return;
                        await deleteForever({ id: selectedNote._id });
                        setSelectedNoteId(null);
                      }}
                    >
                      Delete Forever
                    </button>
                  </div>
                </>
              )}
            </div>

            {mode === "view" && (
              <div
                className="selected-note-body"
                dangerouslySetInnerHTML={{ __html: selectedNote.body || "" }}
              ></div>
            )}

            {tab !== "trash" && (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
