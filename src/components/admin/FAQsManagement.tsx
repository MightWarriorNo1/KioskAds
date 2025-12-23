import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, Eye, Code, Bold, Italic, List, Type } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

interface FAQSection {
  id: string;
  title: string;
  content: string;
}

export default function FAQsManagement() {
  const { addNotification } = useNotification();
  const [faqSections, setFaqSections] = useState<FAQSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [viewModes, setViewModes] = useState<Record<string, 'edit' | 'preview' | 'split'>>({});

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const settings = await AdminService.getSystemSettings();
      
      const faqsSetting = settings.find(s => s.key === 'faqs_content');
      
      if (faqsSetting?.value) {
        try {
          // Handle both cases: value might be an object (from JSONB) or a string (legacy)
          let parsed;
          if (typeof faqsSetting.value === 'string') {
            parsed = JSON.parse(faqsSetting.value);
          } else {
            parsed = faqsSetting.value;
          }
          setFaqSections(Array.isArray(parsed) ? parsed : []);
        } catch {
          setFaqSections([]);
        }
      } else {
        // Default FAQs if none exist
        setFaqSections([
          {
            id: 'terms',
            title: 'Terms of Service',
            content: '<h3 class="font-semibold mb-3">1. Introduction & Agreement</h3><p class="mb-4">Welcome to EZKioskAds.com ("Platform"). By signing up for, accessing, or using our services, you agree to comply with and be bound by these Terms of Service ("Terms"). If you do not consent to these Terms, you may not use the Platform.</p>'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
      addNotification('error', 'Error', 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Pass the array directly - updateSystemSetting will handle JSONB storage correctly
      await AdminService.updateSystemSetting('faqs_content', faqSections, true);

      addNotification('success', 'Success', 'FAQs saved successfully');
    } catch (error) {
      console.error('Error saving FAQs:', error);
      addNotification('error', 'Error', 'Failed to save FAQs');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = () => {
    const newSection: FAQSection = {
      id: `faq-${Date.now()}`,
      title: 'New FAQ Section',
      content: '<p>Enter FAQ content here...</p>'
    };
    setFaqSections([...faqSections, newSection]);
    setExpandedSection(newSection.id);
  };

  const handleDeleteSection = (id: string) => {
    if (window.confirm('Are you sure you want to delete this FAQ section?')) {
      setFaqSections(faqSections.filter(s => s.id !== id));
      if (expandedSection === id) {
        setExpandedSection(null);
      }
    }
  };

  const handleUpdateSection = (id: string, field: 'title' | 'content', value: string) => {
    setFaqSections(faqSections.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const insertHTMLTag = (id: string, tag: string) => {
    const section = faqSections.find(s => s.id === id);
    if (!section) return;

    const textarea = document.getElementById(`content-${id}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = section.content.substring(start, end);
    let newText = '';

    switch (tag) {
      case 'h3':
        newText = section.content.substring(0, start) + 
                  `<h3 class="font-semibold mb-3">${selectedText || 'Heading'}</h3>` + 
                  section.content.substring(end);
        break;
      case 'p':
        newText = section.content.substring(0, start) + 
                  `<p class="mb-4">${selectedText || 'Paragraph text'}</p>` + 
                  section.content.substring(end);
        break;
      case 'ul':
        newText = section.content.substring(0, start) + 
                  `<ul class="list-disc list-inside mb-4 space-y-2">\n  <li>${selectedText || 'List item'}</li>\n</ul>` + 
                  section.content.substring(end);
        break;
      case 'strong':
        newText = section.content.substring(0, start) + 
                  `<strong>${selectedText || 'Bold text'}</strong>` + 
                  section.content.substring(end);
        break;
      case 'em':
        newText = section.content.substring(0, start) + 
                  `<em>${selectedText || 'Italic text'}</em>` + 
                  section.content.substring(end);
        break;
      default:
        return;
    }

    handleUpdateSection(id, 'content', newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + newText.length - section.content.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...faqSections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newSections.length) {
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      setFaqSections(newSections);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">FAQs Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Edit the Frequently Asked Questions page content
          </p>
        </div>
        <button
          onClick={handleAddSection}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Section</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {faqSections.map((section, index) => (
            <div
              key={section.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-semibold text-gray-900 dark:text-white">
                  {section.title || 'Untitled Section'}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSection(index, 'up');
                      }}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSection(index, 'down');
                      }}
                      disabled={index === faqSections.length - 1}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSection(section.id);
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Delete section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {expandedSection === section.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>
              
              {expandedSection === section.id && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleUpdateSection(section.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter section title..."
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Section Content
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const currentMode = viewModes[section.id] || 'split';
                            const nextMode = currentMode === 'edit' ? 'preview' : currentMode === 'preview' ? 'split' : 'edit';
                            setViewModes({ ...viewModes, [section.id]: nextMode });
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {(() => {
                            const mode = viewModes[section.id] || 'split';
                            if (mode === 'edit') return <><Code className="h-3 w-3" /><span className="capitalize">{mode}</span></>;
                            if (mode === 'preview') return <><Eye className="h-3 w-3" /><span className="capitalize">{mode}</span></>;
                            return <><Code className="h-3 w-3" /><Eye className="h-3 w-3" /><span className="capitalize">{mode}</span></>;
                          })()}
                        </button>
                      </div>
                    </div>

                    {/* Formatting Toolbar */}
                    <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-t-lg">
                      <button
                        type="button"
                        onClick={() => insertHTMLTag(section.id, 'h3')}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Heading"
                      >
                        <Type className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHTMLTag(section.id, 'p')}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Paragraph"
                      >
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">P</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHTMLTag(section.id, 'strong')}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Bold"
                      >
                        <Bold className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHTMLTag(section.id, 'em')}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Italic"
                      >
                        <Italic className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHTMLTag(section.id, 'ul')}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Bullet List"
                      >
                        <List className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Editor/Preview Area */}
                    {(() => {
                      const mode = viewModes[section.id] || 'split';
                      return (
                        <div className={`grid gap-4 ${mode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {(mode === 'edit' || mode === 'split') && (
                        <div>
                          <textarea
                            id={`content-${section.id}`}
                            value={section.content}
                            onChange={(e) => handleUpdateSection(section.id, 'content', e.target.value)}
                            rows={15}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="Enter HTML content..."
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Use the toolbar above to insert common HTML tags, or type HTML directly.
                          </p>
                        </div>
                      )}
                      
                          {(mode === 'preview' || mode === 'split') && (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                              <div className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                                <div dangerouslySetInnerHTML={{ __html: section.content || '<p class="text-gray-400 italic">Preview will appear here...</p>' }} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {faqSections.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No FAQ sections yet. Click "Add Section" to create your first FAQ.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save FAQs'}</span>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Note:</strong> The FAQs page is accessible at <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/faqs</code>. 
          Changes will be visible immediately after saving.
        </p>
      </div>
    </div>
  );
}

