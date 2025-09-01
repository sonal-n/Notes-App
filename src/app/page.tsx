"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import "./page.css";
import { FiHome } from "react-icons/fi"
import { LuPin } from "react-icons/lu"
import { FaTag, FaTrashAlt, FaSearch } from "react-icons/fa";
import { FaNoteSticky } from "react-icons/fa6";

export default function Page() {
  const [searchText, setSearchText] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const notes = useQuery(api.notes.listNotes, { searchText }) ?? [];

  const selectedNote = useMemo(() => (
    notes.find((n: any) => n._id === selectedNoteId) ?? null
  ), [notes, selectedNoteId]);

  useEffect(() => {
    if (selectedNoteId && !selectedNote) setSelectedNoteId(null);
  }, [selectedNoteId, selectedNote]);

  const pinnedNotes = useMemo(() => notes.filter((n: any) => n.pinned), [notes]);
  const otherNotes = useMemo(() => notes.filter((n: any) => !n.pinned), [notes]);

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
          <div>
          {pinnedNotes.map((n:any)=>(
            <button className="note" key={n._id} onClick={()=>{ setSelectedNoteId(n._id); setMode("view"); }}
              >
              <div className="note-title">{n.title || "Untitled"}</div>
              <div className="note-body">{(n.body||"").slice(0,80)}</div>
            </button>
          ))}
        </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}