'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

export const AppearanceSection: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [language, setLanguage] = useState('en-US');
  const [timezone, setTimezone] = useState('UTC+7');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance & Regional Preferences</CardTitle>
        <CardDescription>Customize UI visual theme, language, and organizational timezone</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Options */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-3">
            Interface Theme
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50/40 text-blue-700 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sun className="h-5 w-5" />
              <span>Light Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-blue-600 bg-blue-50/40 text-blue-700 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Moon className="h-5 w-5" />
              <span>Dark Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                theme === 'system'
                  ? 'border-blue-600 bg-blue-50/40 text-blue-700 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Laptop className="h-5 w-5" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <Select
            label="System Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            options={[
              { value: 'en-US', label: 'English (United States)' },
              { value: 'id-ID', label: 'Bahasa Indonesia' },
              { value: 'en-GB', label: 'English (United Kingdom)' },
            ]}
          />

          <Select
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            options={[
              { value: 'UTC+7', label: '(UTC+07:00) Jakarta, Bangkok, Hanoi' },
              { value: 'UTC+8', label: '(UTC+08:00) Singapore, Kuala Lumpur' },
              { value: 'UTC+0', label: '(UTC+00:00) London, Dublin, Lisbon' },
              { value: 'UTC-5', label: '(UTC-05:00) Eastern Time (US & Canada)' },
              { value: 'UTC-8', label: '(UTC-08:00) Pacific Time (US & Canada)' },
            ]}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center">
        {isSaved ? (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Appearance settings saved!
          </span>
        ) : (
          <span className="text-xs text-slate-400">Settings applied locally</span>
        )}
        <Button variant="primary" onClick={handleSave}>
          Save Appearance
        </Button>
      </CardFooter>
    </Card>
  );
};
