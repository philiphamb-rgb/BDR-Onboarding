// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Avatar, SkeletonCard, toast } from '@/components/ui'
import { BackIcon, EditIcon } from '@/components/icons'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      supabase.from('users').select('name, phone, avatar_url').eq('id', user.id).single().then(({ data }) => {
        setName(data?.name ?? '')
        setPhone(data?.phone ?? '')
        setAvatarUrl(data?.avatar_url ?? null)
        setLoading(false)
      })
    })
  }, [])

  const pickFile = () => fileRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast.error('Upload failed — try again'); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust so the new image shows immediately (path is stable on re-upload).
      const url = `${publicUrl}?v=${Date.now()}`
      const { error: updErr } = await supabase.from('users').update({ avatar_url: url }).eq('id', userId)
      if (updErr) { toast.error('Could not save photo'); return }
      setAvatarUrl(url)
      toast.success('Profile photo updated')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = async () => {
    if (!userId) return
    setSaving(true)
    const trimmed = name.trim()
    const first = trimmed.split(' ')[0] || ''
    const last = trimmed.split(' ').slice(1).join(' ') || ''
    const { error } = await supabase.from('users')
      .update({ name: trimmed, first_name: first, last_name: last, phone: phone.trim() || null })
      .eq('id', userId)
    setSaving(false)
    if (error) { toast.error('Could not save changes'); return }
    toast.success('Profile saved')
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>

  return (
    <div className="space-y-5 pb-4">
      <button onClick={() => router.push('/settings')} className="flex items-center gap-2 text-sm text-gray hover:text-dark-text">
        <BackIcon size={16} /> Settings
      </button>

      <div>
        <h1 className="text-h1 text-dark-text">Profile</h1>
        <p className="mt-0.5 text-[13px] text-gray">Update your photo and details.</p>
      </div>

      {/* Avatar */}
      <Card className="flex items-center gap-4">
        <div className="relative">
          <Avatar src={avatarUrl} name={name || 'BDR'} size={72} />
          <button onClick={pickFile} aria-label="Change photo"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white shadow-button hover:bg-navy-dark">
            <EditIcon size={13} />
          </button>
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-[700] text-dark-text">{name || 'Your name'}</div>
          <button onClick={pickFile} disabled={uploading} className="mt-1 text-[12px] font-[700] text-teal hover:text-teal-dark disabled:opacity-60">
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <p className="mt-0.5 text-[11px] text-gray">JPG or PNG, up to 5 MB.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      </Card>

      {/* Details */}
      <Card className="space-y-3">
        <div>
          <label className="label mb-1 block">Full name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] text-dark-text focus:outline-none focus:ring-2 focus:ring-navy" />
        </div>
        <div>
          <label className="label mb-1 block">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="Optional"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] text-dark-text focus:outline-none focus:ring-2 focus:ring-navy" />
        </div>
        <Button onClick={save} loading={saving} fullWidth>Save changes</Button>
      </Card>
    </div>
  )
}
