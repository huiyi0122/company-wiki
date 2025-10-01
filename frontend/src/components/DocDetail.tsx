// src/components/DocDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import Sidebar from "./Sidebar";
import { PERMISSIONS, API_BASE_URL } from "./CommonTypes";
import type { User, DocItem } from "./CommonTypes";
import "../styles/DocDetail.css";

interface DocDetailProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function DocDetail({
  currentUser,
  setCurrentUser,
}: DocDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;

    fetch(`${API_BASE_URL}/articles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: DocItem) => setDoc(data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!doc) return <p className="loading-message">Document not found ❌</p>;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure to delete this document?")) return;
    const token = localStorage.getItem("token");
    if (!token || !id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/articles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Deleted!");
      navigate("/docs");
    } catch (err) {
      console.error(err);
      alert("Delete failed!");
    }
  };

  const exportPDF = async () => {
    const element = document.getElementById("doc-content");
    if (!element) return alert("Cannot find content to export!");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        scrollY: -window.scrollY,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${doc.title || "document"}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Export PDF failed!");
    }
  };

  const exportWord = async () => {
    const lines = doc.content.split("\n");
    const children = [
      new Paragraph({ text: doc.title || "Untitled", heading: HeadingLevel.HEADING_1 }),
      ...lines.map((line) => new Paragraph(line)),
    ];
    const docx = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(docx);
    saveAs(blob, `${doc.title || "document"}.docx`);
  };

  return (
    <div className="layout">
      <Sidebar
        setCategory={() => {}}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
      <div className="main-content-with-sidebar">
        <div className="doc-top">
          <h2>{doc.title}</h2>
          <p>
            <strong>Category:</strong> {doc.category}
          </p>
          <p>
            <strong>Author:</strong> {doc.author || "Unknown"}
          </p>

          <div className="doc-buttons" style={{ marginBottom: "20px" }}>
            {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
              <button className="edit" onClick={() => navigate(`/editor/${id}`)}>
                Edit
              </button>
            )}
            {currentUser &&
              (currentUser.role === "admin" ||
                (currentUser.role === "editor" &&
                  doc.author === currentUser.username)) && (
                <button className="delete" onClick={handleDelete}>
                  Delete
                </button>
              )}
            <button className="view" onClick={exportPDF}>
              Export PDF
            </button>
            <button className="view" onClick={exportWord}>
              Export Word
            </button>
          </div>

          <div
            id="doc-content"
            style={{
              padding: "20px",
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: "12px",
            }}
          >
            {/* ✅ 这里设置 height={700}，替换默认 200 */}
            <MDEditor
              value={doc.content}
              preview="preview"
              hideToolbar={true}
              height={700}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
