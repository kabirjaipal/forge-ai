'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

  if (isLoading || user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center animate-bounce shadow-md">
            <Zap className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/40 text-foreground">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight font-heading text-foreground">
              Forge<span className="text-primary">AI</span>
            </span>
          </Link>
        </div>

        <Card className="white-panel border-border shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground font-heading">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Sign in to your ForgeAI workspace
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-danger" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="bg-background border-border text-foreground h-10 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background border-border text-foreground h-10 rounded-lg"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                size="lg"
                className="w-full h-11 text-sm rounded-lg"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" />
                ) : (
                  <>
                    Sign In to Workspace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-muted-foreground">
              Don't have a workspace account?{' '}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Create an Account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
