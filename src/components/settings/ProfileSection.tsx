'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Camera, Check } from 'lucide-react';

export const ProfileSection: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json) return;
        const user = json.data || json;
        const emp = user.employee;
        if (emp) {
          const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
          setFullName(name || user.email?.split('@')[0] || 'User');
          setEmail(emp.email || user.email || '');
          setTitle(emp.position || (user.role === 'ADMIN' ? 'Administrator' : user.role === 'HR' ? 'HR Lead' : 'Staff Employee'));
          setPhone(emp.phone || '');
          if (emp.photo) setAvatar(emp.photo);
        } else if (user) {
          setFullName(user.email?.split('@')[0] || 'User');
          setEmail(user.email || '');
          setTitle(user.role === 'ADMIN' ? 'Administrator' : user.role === 'HR' ? 'HR Lead' : 'Staff Employee');
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Profile</CardTitle>
        <CardDescription>Update your personal information and contact details</CardDescription>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-6">
          {/* Avatar Change */}
          <div className="flex items-center gap-4">
            <Avatar
              name={fullName || 'User'}
              src={avatar}
              size="xl"
            />
            <div>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <Camera className="h-3.5 w-3.5" />
                Change Avatar
              </Button>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Recommended PNG or JPG, max 2MB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between items-center">
          {isSaved ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Profile changes saved successfully!
            </span>
          ) : (
            <span className="text-xs text-slate-400">All fields are editable for prototype demo</span>
          )}
          <Button type="submit" variant="primary">
            Save Profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
