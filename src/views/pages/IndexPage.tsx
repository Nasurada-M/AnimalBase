import { useNavigate } from 'react-router-dom';
import { Heart, Search, FileText, Shield, Star, ChevronRight, PawPrint, Users, Award } from 'lucide-react';

export default function IndexPage() {
  const navigate = useNavigate();

  const features = [
    { icon: Search, title: 'Find Your Match', desc: 'Browse hundreds of pets available for adoption. Filter by type, breed, age, and location to find the perfect companion.' },
    { icon: Heart, title: 'Easy Adoption', desc: 'Our streamlined application process makes adopting simple. Submit your application and we guide you every step.' },
    { icon: PawPrint, title: 'Pet Finder', desc: 'Lost a pet or spotted a stray? Our Pet Finder helps reunite pets with their families through community sightings.' },
    { icon: Shield, title: 'Verified Shelters', desc: 'All pets on AnimalBase come from trusted, verified shelters committed to animal welfare.' },
    { icon: FileText, title: 'Track Applications', desc: 'Monitor your adoption applications in real time — pending, approved, or needing updates.' },
    { icon: Users, title: 'Community Driven', desc: 'Join thousands of animal lovers making a difference one adoption at a time.' },
  ];

  const testimonials = [
    { name: 'Sarah M.', pet: 'Adopted Max the Golden Retriever', text: 'AnimalBase made adopting Max so easy! The whole process was transparent and the shelter was wonderful.', stars: 5 },
    { name: 'Carlos T.', pet: 'Adopted Lily the Tabby Cat', text: "Found my perfect companion in Lily. The pet detail page had everything I needed to make my decision.", stars: 5 },
    { name: 'Emma K.', pet: 'Reunited with Buddy via Pet Finder', text: 'Buddy went missing for a week. A neighbor spotted him through AnimalBase and we were reunited!', stars: 5 },
  ];

  return (
    <div className="min-h-screen font-sans bg-white">
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-primary-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-primary-800">AnimalBase</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="btn-outline hidden sm:block">Log in</button>
            <button onClick={() => navigate('/signup')} className="btn-primary">Get Started</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 px-6 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-300 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/3" />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <Heart className="w-4 h-4 fill-primary-500 text-primary-500" />
                Over 2,000+ pets find homes monthly
              </div>
              <h1 className="font-display text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Give a pet<br />
                <span className="text-primary-600">a loving home</span><br />
                they deserve
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
                AnimalBase connects loving families with pets in need. Browse adoptable animals, track your applications, and help reunite lost pets with their owners.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => navigate('/signup')} className="btn-primary flex items-center gap-2 text-base px-7 py-3.5">
                  Start Adopting <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate('/login')} className="btn-outline flex items-center gap-2 text-base px-7 py-3.5">
                  Sign In
                </button>
              </div>
              <div className="flex items-center gap-6 mt-10">
                {[['2,400+', 'Pets Adopted'], ['180+', 'Shelters'], ['98%', 'Happy Owners']].map(([num, label]) => (
                  <div key={label}>
                    <div className="font-display font-bold text-2xl text-primary-700">{num}</div>
                    <div className="text-sm text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative animate-fade-in hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                {[
                  'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=300&q=80',
                  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=300&q=80',
                  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&q=80',
                  'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=300&q=80',
                ].map((url, i) => (
                  <div key={i} className={`rounded-2xl overflow-hidden shadow-lg ${i === 1 ? 'mt-6' : i === 2 ? '-mt-4' : ''}`}>
                    <img src={url} alt="pet" className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-4 -right-4 bg-primary-600 text-white rounded-2xl p-4 shadow-xl">
                <Award className="w-6 h-6 mb-1" />
                <div className="font-bold text-sm">Top Rated</div>
                <div className="text-xs opacity-80">Adoption Platform</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6 bg-primary-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">Everything you need to adopt</h2>
            <p className="text-gray-600 max-w-xl mx-auto">From browsing pets to submitting applications — we make the entire process seamless and joyful.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm card-hover border border-primary-100">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-display font-bold text-lg text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="relative">
              <img src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80" alt="animals" className="rounded-3xl shadow-2xl w-full object-cover h-80" />
              <div className="absolute -top-5 -left-5 bg-white rounded-2xl p-4 shadow-xl border border-primary-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Street pets need</div>
                    <div className="text-gray-500 text-xs">our protection</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-5 leading-tight">
              About <span className="text-primary-600">AnimalBase</span>
            </h2>
            <p className="text-gray-600 mb-5 leading-relaxed">
              AnimalBase was born from a simple belief: every animal deserves a loving home. We built a platform that makes the adoption process transparent, accessible, and heartfelt.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We work with verified shelters across the country to connect animals in need with caring families. Beyond adoption, we also help communities reunite lost pets with their owners through our Pet Finder network.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[['Verified Shelters', '180+'], ['Pets Rehomed', '2,400+'], ['Cities Covered', '45+'], ['Community Members', '12,000+']].map(([label, val]) => (
                <div key={label} className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                  <div className="font-display font-bold text-2xl text-primary-700">{val}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary-700 to-primary-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-white mb-4">Stories of love & hope</h2>
            <p className="text-primary-200 max-w-xl mx-auto">Real stories from families who found their perfect furry companions through AnimalBase.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ name, pet, text, stars }) => (
              <div key={name} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex gap-1 mb-4">
                  {Array(stars).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/90 text-sm leading-relaxed mb-5">"{text}"</p>
                <div>
                  <div className="font-bold text-white text-sm">{name}</div>
                  <div className="text-primary-300 text-xs">{pet}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <PawPrint className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="font-display text-4xl font-bold text-gray-900 mb-5">Ready to find your companion?</h2>
          <p className="text-gray-600 mb-8 text-lg">Join thousands of families who have given a pet a second chance at happiness.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate('/signup')} className="btn-primary text-base px-8 py-3.5">
              Create Free Account
            </button>
            <button onClick={() => navigate('/login')} className="btn-outline text-base px-8 py-3.5">
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-primary-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-primary-800">AnimalBase</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 AnimalBase. Made with ❤️ for animals.</p>
        </div>
      </footer>
    </div>
  );
}