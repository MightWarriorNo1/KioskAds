import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, DollarSign, CheckCircle, MapPin } from 'lucide-react';
import { getCurrentCaliforniaTime } from '../../utils/dateUtils';

type BookingType = 'weekly' | 'subscription';

function getWeeklyRate(priceText?: string): number {
  if (!priceText) return 0;
  const match = priceText.replace(/[^0-9.]/g, '');
  const num = parseFloat(match);
  return isNaN(num) ? 0 : num;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthGrid(date: Date) {
  const first = startOfMonth(date);
  const startDay = first.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d));
  return cells;
}

export default function HostSelectWeeksPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: any };
  const kiosks = (location.state?.kiosks || []);
  const kiosk = kiosks[0] || location.state?.kiosk;
  const weeklyRate = getWeeklyRate(kiosk?.price);
  const useCustomAd = location.state?.useCustomAd;

  const steps = [
    { number: 1, name: 'Setup Service', current: false, completed: true },
    { number: 2, name: 'Select Kiosk', current: false, completed: true },
    { number: 3, name: 'Select Subscription', current: true, completed: false },
    { number: 4, name: 'Add Media & Duration', current: false, completed: false },
    { number: 5, name: 'Review & Submit', current: false, completed: false }
  ];

  const [bookingType] = React.useState<BookingType>('subscription');
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(getCurrentCaliforniaTime());
  const [selectedMondays, setSelectedMondays] = React.useState<string[]>([]);
  const [subSlots, setSubSlots] = React.useState<number>(1);
  const [subscriptionDuration, setSubscriptionDuration] = React.useState<number>(1); // Custom number of months
  const [customMonths, setCustomMonths] = React.useState<string>(''); // For custom input
  const [subStartMonday, setSubStartMonday] = React.useState<string | null>(null);

  const cells = React.useMemo(() => getMonthGrid(calendarMonth), [calendarMonth]);
  const fmt = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isPastDate = (d: Date) => {
    const today = getCurrentCaliforniaTime();
    today.setHours(0, 0, 0, 0);
    return d <= today;
  };

  const isDateBlocked = (d: Date) => {
    // Don't block dates that are part of the current selection
    if (isDateInSelectedWeek(d)) {
      return false;
    }
    
    return selectedMondays.some(selectedDate => {
      const selected = new Date(selectedDate + 'T00:00:00');
      const diffTime = d.getTime() - selected.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7;
    });
  };

  // Check if a date is part of a selected week
  const isDateInSelectedWeek = (d: Date) => {
    return selectedMondays.some(selectedDate => {
      const selected = new Date(selectedDate + 'T00:00:00');
      const diffTime = d.getTime() - selected.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Check if date is within the selected week (0-6 days from Monday)
      return diffDays >= 0 && diffDays < 7;
    });
  };

  const isSubscriptionDateBlocked = (d: Date) => {
    if (!subStartMonday) return false;
    const selected = new Date(subStartMonday + 'T00:00:00');
    const diffTime = d.getTime() - selected.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const blockDays = subscriptionDuration * 30; // Block for the selected duration
    return diffDays >= 0 && diffDays <= blockDays;
  };

  const toggleWeeklyMonday = (d: Date) => {
    if (isPastDate(d)) return;
    const id = fmt(d);
    setSelectedMondays((prev) => {
      if (prev.includes(id)) {
        // Allow unselecting by clicking on selected date
        return prev.filter(x => x !== id);
      } else {
        if (prev.length >= 4) {
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const selectSubscriptionStart = (d: Date) => {
    if (isPastDate(d)) return;
    const id = fmt(d);
    // Allow unselecting by clicking on the same date again
    if (subStartMonday === id) {
      setSubStartMonday(null);
    } else {
      setSubStartMonday(id);
    }
  };

  const subscriptionValid = subStartMonday !== null && subSlots > 0;
  const canContinue = subscriptionValid;

  // Calculate monthly cost (kiosk price is already monthly)
  const monthlyCost = subSlots * weeklyRate;
  // No discount applied - base cost only
  const totalCost = monthlyCost * subscriptionDuration;
  const totalCostAfterDiscount = totalCost;

  const toDate = (iso: string) => new Date(iso + 'T00:00:00');
  const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  const formatRange = (start: Date, end: Date) => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString(undefined, opts);
    const endStr = end.toLocaleDateString(undefined, opts);
    const yearStr = end.getFullYear();
    return `${startStr} - ${endStr}, ${yearStr}`;
  };

  const sortedMondays = React.useMemo(() => [...selectedMondays].sort(), [selectedMondays]);
  type Block = { start: Date; end: Date; count: number };
  const blocks: Block[] = React.useMemo(() => {
    const b: Block[] = [];
    let i = 0;
    while (i < sortedMondays.length) {
      const start = toDate(sortedMondays[i]);
      let end = addDays(start, 6);
      let count = 1;
      let j = i + 1;
      while (j < sortedMondays.length) {
        const next = toDate(sortedMondays[j]);
        const expectedNext = addDays(start, count * 7);
        if (next.getTime() === expectedNext.getTime()) {
          count += 1;
          end = addDays(next, 6);
          j += 1;
        } else {
          break;
        }
      }
      b.push({ start, end, count });
      i = j;
    }
    return b;
  }, [sortedMondays]);

  return (
    <div>
      {/* Steps header (desktop) */}
      <div className="mb-6 md:mb-8">
        <div className="hidden md:flex items-center space-x-4 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
                step.completed 
                  ? 'bg-green-600 text-white' 
                  : step.current
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step.completed ? '✓' : step.number}
              </div>
              <span className={`ml-2 text-sm font-medium whitespace-nowrap ${
                step.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-1 mx-4 ${
                  step.completed ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/host/kiosk-selection')} 
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Select Kiosk</span>
        </button>
      </div>

      {/* Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 mb-8">
        <div className="mb-6">
          <div className="text-sm text-gray-600 dark:text-gray-300">Select Subscription</div>
          {kiosks.length > 1 ? (
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{kiosks.length} kiosks selected</div>
          ) : (
            <>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{kiosk?.name || 'Selected Kiosk'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{kiosk?.city || 'Location'}</div>
            </>
          )}
        </div>

        {kiosks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {kiosks.map((k: any) => (
              <div key={k.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-blue-800 dark:text-blue-200">{k.name}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">{k.city}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{k.price || '$0/month'}</div>
                    <div className="text-sm text-blue-500 dark:text-blue-400">per month</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300 mb-6">
          Monthly Subscription — Select a start date for your monthly subscription. Your subscription will run for 30 days from the selected start date.
        </div>

        {/* Week-by-week calendar - REMOVED */}
        {false && (
          <div>
            <div className="mb-3 text-sm font-semibold flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Select Weeks</span>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 bg-gray-50 dark:bg-gray-900/50 max-w-2xl shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center space-x-2 md:space-x-3">
                  <button 
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1, 1))} 
                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center shadow-soft"
                  >
                    <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  <button 
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 1))} 
                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center shadow-soft"
                  >
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  {selectedMondays.length > 0 && (
                    <button
                      onClick={() => setSelectedMondays([])}
                      className="inline-flex items-center px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shadow-soft ml-2 text-sm"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-2 text-xs md:text-sm font-semibold text-center text-gray-600 dark:text-gray-400 mb-3 md:mb-4">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-1 md:py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {cells.map((c, i) => c ? (
                  <button
                    key={i}
                    disabled={isPastDate(c) || isDateBlocked(c)}
                    onClick={() => !isPastDate(c) && !isDateBlocked(c) && toggleWeeklyMonday(c)}
                    className={`h-8 md:h-12 text-xs md:text-sm rounded-lg md:rounded-xl font-medium transition-all duration-200 ${
                      isPastDate(c)
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                        : isDateBlocked(c)
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-red-100 dark:bg-red-900/20'
                        : isDateInSelectedWeek(c)
                          ? 'bg-red-500 text-white shadow-lg scale-105 ring-2 ring-blue-200 dark:ring-blue-800' 
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 border border-transparent'
                    }`}
                  >
                    {c.getDate()}
                  </button>
                ) : <div key={i} />)}
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 md:w-4 md:h-4 bg-white dark:bg-gray-800 rounded border"/>
                  <span>Available Dates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 md:w-4 md:h-4 bg-blue-500 rounded"/>
                  <span>Selected Weeks (click to unselect)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 md:w-4 md:h-4 bg-red-100 dark:bg-red-900/20 rounded border"/>
                  <span>Blocked (1 week)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 md:w-4 md:h-4 bg-gray-100 dark:bg-gray-800 rounded border"/>
                  <span>Past & Today</span>
                </div>
              </div>
            </div>

            {/* Selected Weeks & Campaign Blocks */}
            {selectedMondays.length > 0 ? (
              <div className="mt-6 space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-green-800 dark:text-green-200">Weeks Selected</div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        You have selected {selectedMondays.length} week{selectedMondays.length > 1 ? 's' : ''} for your campaign
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-800 dark:text-green-200">
                        {selectedMondays.length}/4 weeks
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">Maximum</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-soft">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white">Selected Weeks</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">{selectedMondays.length} week{selectedMondays.length > 1 ? 's' : ''} selected</span>
                    </div>
                  </div>
                  {sortedMondays.map((iso, idx) => {
                    const start = toDate(iso);
                    const end = addDays(start, 6);
                    return (
                      <div key={iso} className="text-sm text-gray-800 dark:text-gray-200">
                        Week {idx + 1}: {formatRange(start, end)}
                      </div>
                    );
                  })}
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-soft">
                  <div className="font-semibold text-gray-900 dark:text-white mb-2">Campaign Blocks</div>
                  <div className="space-y-3">
                    {blocks.map((b, i) => (
                      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                        <div className="font-medium text-gray-900 dark:text-white">Campaign {i+1}:</div>
                        <div className="text-sm text-gray-800 dark:text-gray-200">{formatRange(b.start, b.end)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.count} consecutive {b.count === 1 ? 'week' : 'weeks'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No weeks selected yet</h3>
                <p className="text-gray-600 dark:text-gray-300">Click on the available Mondays above to select weeks for your campaign.</p>
              </div>
            )}
          </div>
        )}

        {/* Subscription controls */}
        {true && (
          <div>
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Subscription Configuration</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                      Subscription Duration
                    </label>
                    <div className="flex flex-wrap items-end gap-3">
                      {/* 1 Month Option */}
                      <button
                        onClick={() => {
                          setSubscriptionDuration(1);
                          setCustomMonths('');
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          subscriptionDuration === 1 && !customMonths
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`text-lg font-bold ${subscriptionDuration === 1 && !customMonths ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                          1 Month
                        </div>
                      </button>
                      
                      {/* Custom Months Input */}
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Monthly Subscription
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={customMonths}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCustomMonths(value);
                              const numValue = parseInt(value, 10);
                              if (!isNaN(numValue) && numValue > 0) {
                                setSubscriptionDuration(numValue);
                              }
                            }}
                            onBlur={(e) => {
                              const numValue = parseInt(e.target.value, 10);
                              if (isNaN(numValue) || numValue < 1) {
                                setCustomMonths('');
                                setSubscriptionDuration(1);
                              } else {
                                setSubscriptionDuration(Math.min(numValue, 24)); // Max 24 months
                                setCustomMonths(String(Math.min(numValue, 24)));
                              }
                            }}
                            placeholder="Enter number of months"
                            className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                              customMonths && subscriptionDuration > 1
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                        </div>
                        {customMonths && subscriptionDuration > 1 && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {subscriptionDuration} month{subscriptionDuration > 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                
              </div>
            </div>

            <div className="rounded border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300 mb-6">
              Subscription Selection — Select any date from tomorrow onwards to start your subscription. The next {subscriptionDuration * 30} days will be blocked to prevent conflicts.
            </div>

            <div className="mb-3 text-sm font-semibold flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Select Start Date</span>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50 max-w-2xl shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1, 1))} 
                    className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center shadow-soft"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 1))} 
                    className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center shadow-soft"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-sm font-semibold text-center text-gray-600 dark:text-gray-400 mb-4">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {cells.map((c, i) => c ? (
                  <button
                    key={i}
                    disabled={isPastDate(c) || isSubscriptionDateBlocked(c)}
                    onClick={() => !isPastDate(c) && !isSubscriptionDateBlocked(c) && selectSubscriptionStart(c)}
                    className={`h-12 text-sm rounded-xl font-medium transition-all duration-200 ${
                      isPastDate(c)
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                        : isSubscriptionDateBlocked(c)
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-red-100 dark:bg-red-900/20'
                        : subStartMonday === fmt(c) 
                          ? 'bg-blue-500 text-white shadow-lg scale-105 ring-2 ring-blue-200 dark:ring-blue-800' 
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 border border-transparent'
                    }`}
                  >
                    {c.getDate()}
                  </button>
                ) : <div key={i} />)}
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 bg-white dark:bg-gray-800 rounded border flex-shrink-0"/>
                  <span className="whitespace-nowrap">Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded flex-shrink-0"/>
                  <span className="whitespace-nowrap">Selected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 bg-red-100 dark:bg-red-900/20 rounded border flex-shrink-0"/>
                  <span className="whitespace-nowrap">Blocked ({subscriptionDuration} month{subscriptionDuration > 1 ? 's' : ''})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 bg-gray-100 dark:bg-gray-800 rounded border flex-shrink-0"/>
                  <span className="whitespace-nowrap">Past & Today</span>
                </div>
              </div>
            </div>

            {subStartMonday && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-green-800 dark:text-green-200">Start Month Selected</div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        Your subscription will begin on {toDate(subStartMonday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} and run for {subscriptionDuration} month{subscriptionDuration > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSubStartMonday(null)}
                    className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button 
            onClick={() => {
              if (canContinue) {
                // Monthly subscription only
                const campaignData = {
                  kiosks: kiosks.length ? kiosks : kiosk ? [kiosk] : [],
                  kiosk: kiosk,
                  selectedWeeks: [{
                    startDate: subStartMonday!,
                    endDate: new Date(new Date(subStartMonday!).getTime() + (subscriptionDuration * 30 - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // subscriptionDuration months (e.g., 1 month = 30 days, 3 months = 90 days)
                    slots: subSlots
                  }],
                  totalSlots: subSlots,
                  baseRate: weeklyRate,
                  subscriptionDuration: subscriptionDuration,
                  useCustomAd: useCustomAd
                };
                navigate('/host/add-media-duration', { state: campaignData });
              }
            }}
            disabled={!canContinue} 
            className={`group relative px-4 md:px-8 py-3 md:py-4 rounded-xl font-semibold text-sm md:text-lg transition-all duration-200 shadow-soft ${
              canContinue 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canContinue ? (
              <div className="flex items-center space-x-2 md:space-x-3">
                <span className="hidden md:inline">Continue to Ad Duration & Media</span>
              </div>
            ) : (
              <span className="text-xs md:text-base">Select a start date and slots to continue</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


