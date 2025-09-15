import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Target, Palette, Download, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
            Amway IBO
            <span className="text-blue-600"> Image Campaign</span>
            <br />Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform any Amway product URL into professional marketing images.
            Generate cohesive campaigns with AI-powered visuals, automatic compliance,
            and multiple social media formats.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link href="/campaign/new">
                <Zap className="h-5 w-5 mr-2" />
                Create Campaign
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              View Examples
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Smart Product Scraping</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Automatically extract product info, benefits, and images from any Amway URL
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Palette className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">AI-Powered Design</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Generate unique, professional images with customizable styles and formats
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Multiple Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Instagram posts/stories, Facebook covers, Pinterest pins - all optimized
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Download className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Easy Download</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Get organized ZIP packages with usage guidelines and compliance text
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Paste Product URL</h3>
              <p className="text-gray-600 text-sm">
                Enter any Amway product page URL and we&apos;ll extract all the details
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Configure Style</h3>
              <p className="text-gray-600 text-sm">
                Choose your campaign type, brand style, and image formats
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Generation</h3>
              <p className="text-gray-600 text-sm">
                Watch as AI creates professional images with compliance included
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Download & Use</h3>
              <p className="text-gray-600 text-sm">
                Get your organized campaign package ready for social media
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-blue-600 text-white rounded-2xl p-8">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Marketing?
          </h2>
          <p className="text-xl text-blue-100 mb-6">
            Create professional image campaigns in minutes, not hours.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-3">
            <Link href="/campaign/new">
              Get Started Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
