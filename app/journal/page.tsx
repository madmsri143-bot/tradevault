"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { JournalEntry } from "@/types";
import { format } from "date-fns";
import { ImagePlus, Loader2, Calendar as CalendarIcon, Pencil, Trash2, X, Maximize2, BookText } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";

// Shared compressImage utility
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            } else {
              resolve(file); // fallback
            }
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = () => resolve(file); // fallback on error
    };
    reader.onerror = () => resolve(file); // fallback on error
  });
};

const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "journal_upload");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/dnvuge0qb/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.secure_url;
};

export default function JournalPage() {
  const { user } = useAuth();
  const { confirm, alert } = useModal();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  
  // Filter State
  const [filterDate, setFilterDate] = useState("");

  // Form State
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Keep the opened modal synced with live background uploads mapping in from Firestore
  useEffect(() => {
    if (viewingEntry) {
      const liveUpdate = entries.find(e => e.id === viewingEntry.id);
      // Only trigger a re-render if the imageUrl or text genuinely changed
      if (liveUpdate && (liveUpdate.imageUrl !== viewingEntry.imageUrl || liveUpdate.text !== viewingEntry.text)) {
        setViewingEntry(liveUpdate);
      }
    }
  }, [entries, viewingEntry]);

  // Fetch Entries
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "journal"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: JournalEntry[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as JournalEntry[];
        setEntries(fetched);
      },
      (error) => {
        console.error("Error fetching journal entries:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
      await alert({ message: "Max 2MB image allowed", variant: "info" });
      return;
    }
    
    setSubmitting(true);
    try {
      const newEntry: JournalEntry = {
        date: new Date(date).getTime(),
        text,
      };

      // Create doc first to unblock UI immediately
      const docRef = await addDoc(collection(db, "users", user!.uid, "journal"), newEntry);

      const fileToUpload = imageFile;
      
      // Reset form instantly
      setText("");
      setImageFile(null);
      setPreviewUrl(null);
      setSubmitting(false);

      // Background upload
      if (fileToUpload) {
        try {
          const compressedFile = await compressImage(fileToUpload);
          const imageUrl = await uploadToCloudinary(compressedFile);
          await updateDoc(docRef, { imageUrl });
        } catch (imgError) {
          console.error("Image upload failed:", imgError);
          await alert({ message: "Image upload failed, but your journal text was saved." });
        }
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      await alert({ message: "Failed to save entry. Check Firebase configuration." });
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !user) return;
    
    const isConfirmed = await confirm({
      title: "Delete Journal Entry",
      message: "Are you sure you want to delete this journal entry?",
      confirmLabel: "Delete",
      variant: "danger"
    });
    
    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "journal", id));
        if (viewingEntry?.id === id) setViewingEntry(null);
      } catch (error) {
        console.error("Error deleting entry:", error);
        await alert({ message: "Failed to delete entry." });
      }
    }
  };

  // Group entries by date
  const groupedEntries: Record<string, JournalEntry[]> = {};
  entries.forEach((entry) => {
    const dateStr = format(new Date(entry.date), "yyyy-MM-dd");
    if (!groupedEntries[dateStr]) groupedEntries[dateStr] = [];
    groupedEntries[dateStr].push(entry);
  });

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const displayDates = filterDate ? sortedDates.filter(d => d === filterDate) : sortedDates;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Trading Journal</h1>
        <p className="text-sm text-zinc-400 mt-1">Review your mindset, document lessons, and analyze your charts.</p>
      </div>

      {/* Date Filter Bar */}
      <div className="flex items-center gap-4 bg-zinc-900/50 border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 rounded-xl">
        <label className="text-sm font-medium text-zinc-300">Filter by Date:</label>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-48 bg-zinc-950 border border-zinc-800 rounded p-2 pl-9 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark transition-colors"
          />
        </div>
        {filterDate && (
          <button
            onClick={() => setFilterDate("")}
            className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="md:col-span-1">
          <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-6 rounded-xl sticky top-6">
            <h2 className="text-xl font-semibold mb-4 text-emerald-400">New Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type="date"
                    name="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 pl-9 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes & Lesson</label>
                <textarea
                  name="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="How did you feel about today's trades? What did you learn?"
                  required
                  rows={6}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-2">Screenshot (Chart Setup)</label>
                
                {previewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-sm font-medium text-red-400 transition-opacity"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-800 rounded-lg bg-zinc-950 hover:bg-zinc-900/50 hover:border-emerald-500/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImagePlus size={24} className="mb-2 text-zinc-500" />
                      <p className="text-xs text-zinc-400"><span className="font-semibold text-emerald-400">Click to upload</span> or drag and drop</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Journal Entry"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Display Panel */}
        <div className="md:col-span-2 space-y-8">
          {displayDates.length === 0 ? (
            <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-12 rounded-xl flex flex-col items-center justify-center text-center">
              <BookText size={48} className="text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">No Journal Entries Yet</h3>
              <p className="text-sm text-zinc-500 max-w-sm mt-2">
                Start writing your daily logs on the left to review your performance and improve your strategy.
              </p>
            </div>
          ) : (
            displayDates.map((dateStr) => (
              <div key={dateStr} className="relative pl-6 before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-zinc-800 before:z-0">
                
                <div className="relative z-10 flex items-center gap-4 mb-4 -ml-6">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-zinc-950 shrink-0" />
                  <h3 className="text-lg font-bold text-white tracking-widest uppercase">
                    {format(new Date(dateStr), "EEEE, MMM do, yyyy")}
                  </h3>
                </div>

                <div className="space-y-4">
                  {groupedEntries[dateStr].map((entry) => (
                    <div 
                      key={entry.id} 
                      onClick={() => setViewingEntry(entry)}
                      className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 rounded-xl shadow-sm hover:border-emerald-500/50 hover:bg-zinc-800/50 transition-all cursor-pointer group relative"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-zinc-500 font-medium">
                          {format(new Date(entry.date), "h:mm a")}
                        </span>
                        
                        {/* Action Buttons (appear on hover) */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingEntry(entry); }}
                            className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed line-clamp-3">
                        {entry.text}
                      </p>
                      
                      {entry.imageUrl && (
                        <div className="mt-4 rounded-lg overflow-hidden border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none bg-zinc-950/50 h-32 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={entry.imageUrl} 
                            alt="Trading Chart Snapshot" 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Maximize2 className="text-white drop-shadow-lg" size={24} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* View Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setViewingEntry(null)}>
          <div 
            className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900 shrink-0 rounded-t-xl">
              <div className="flex items-center gap-3">
                <CalendarIcon className="text-emerald-500" size={18} />
                <h2 className="text-lg font-semibold text-white">
                  {format(new Date(viewingEntry.date), "EEEE, MMM do, yyyy - h:mm a")}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditingEntry(viewingEntry); setViewingEntry(null); }}
                  className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors mr-2"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => setViewingEntry(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed mb-6 font-medium text-[15px]">
                {viewingEntry.text}
              </p>
              
              {viewingEntry.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none bg-zinc-950/50 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={viewingEntry.imageUrl} 
                    alt="Trading Chart Snapshot" 
                    className="max-w-full h-auto max-h-[60vh] object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <EditEntryModal 
           entry={editingEntry}
           onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}

// Separate component for Edit Modal to manage its own state cleanly
function EditEntryModal({ entry, onClose }: { entry: JournalEntry, onClose: () => void }) {
  const { user } = useAuth();
  const { alert } = useModal();
  const [date, setDate] = useState(format(new Date(entry.date), "yyyy-MM-dd"));
  const [text, setText] = useState(entry.text);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(entry.imageUrl || null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !entry.id) return;

    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
      await alert({ message: "Max 2MB image allowed", variant: "info" });
      return;
    }
    
    setSubmitting(true);
    try {
      let finalImageUrl = entry.imageUrl || null;

      if (imageFile) {
        // We reuse the compressImage function from above
        const compressedFile = await compressImage(imageFile);
        finalImageUrl = await uploadToCloudinary(compressedFile);
      } else if (!previewUrl) {
         finalImageUrl = null;
      }

      await updateDoc(doc(db, "users", user!.uid, "journal", entry.id), {
        date: new Date(date).getTime(),
        text,
        imageUrl: finalImageUrl
      });

      onClose();
    } catch (error) {
      console.error("Error updating journal entry:", error);
      await alert({ message: "Failed to update entry." });
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900 shrink-0">
          <h2 className="text-lg font-semibold text-white">Edit Entry</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"><X size={18} /></button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark" />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Notes</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={6} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm focus:border-emerald-500 focus:outline-none resize-none" />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-2">Image</label>
              {previewUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 group h-32">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-sm font-medium text-red-400 transition-opacity">
                    Remove Image
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-800 rounded-lg bg-zinc-950 hover:bg-zinc-900/50 hover:border-emerald-500/50 transition-colors">
                  <ImagePlus size={20} className="mb-1 text-zinc-500" />
                  <span className="text-xs text-zinc-400">Click to add image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-2 font-medium transition-colors disabled:opacity-50">
                {submitting && <Loader2 size={14} className="animate-spin" />} Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
