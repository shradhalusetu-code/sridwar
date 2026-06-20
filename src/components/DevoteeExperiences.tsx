/*
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Heart, 
  PlusCircle, 
  MapPin, 
  CheckCircle, 
  X,
  Users,
  Feather
} from "lucide-react";
import SriDwarLogo from "./SriDwarLogo";
import { syncToGoogleForm } from "../utils/googleFormSync";

interface Testimonial {
  id: string;
  name: string;
  location: string;
  serviceName: string;
  story: string;
  rating: number;
  badge: string;
  date: string;
  avatarSeed: string; // for consistent styling
  avatarUrl?: string;
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Rohan Sharma",
    location: "New Delhi",
    serviceName: "Kashi Vishwanath Rudrabhishek",
    story: "My father had been facing severe health issues of late. We sponsored the Kashi Vishwanath Rudrabhishek online through Sri Dwar. Seeing the live Sankalpa read with his name and gotra, and receiving the pure ashes and Belpatra Prasad within days brought immense peace. His recovery has been miraculous.",
    rating: 5,
    badge: "Verified Sankalpa & Prasad Received",
    date: "June 2026",
    avatarSeed: "rohan",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "t2",
    name: "Ananya Iyer",
    location: "Bengaluru",
    serviceName: "Vighnaharta Ganesha Success Puja",
    story: "Before launching our technology venture, we registered for the special Ganesha Sankalpa. The transparency was immaculate—real temple receipts, the chief shastri's digital seal on our certificate, and real-time aarti. We signed our first institutional partner last week! Grateful to Sri Dwar.",
    rating: 5,
    badge: "Darshan Certificate Issued",
    date: "May 2026",
    avatarSeed: "ananya",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "t3",
    name: "Meera Nair",
    location: "Ernakulam",
    serviceName: "Sanskrit Gurukul Book Kit Seva",
    story: "I wanted to sponsor traditional education for my mother's birthday. Through the temple seva portal, I gifted Sanskrit books to young students. Sri Dwar shared actual verified photographs of children holding the exact kits stamped with the Gurukul seal. Deeply authentic and transparent. Highly recommended!",
    rating: 5,
    badge: "Verified Seva Impact Witnessed",
    date: "June 2026",
    avatarSeed: "meera",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "t4",
    name: "Vikram Aditya",
    location: "Mumbai",
    serviceName: "Shani Dev Malefic Relief Puja",
    story: "The transit of Saturn was bringing immense struggles in my profession. Initiating the special Saturday Shani-Taila Abhishekam through Sri Dwar brought high tranquil vibes. The live audio streaming was pristine, and the sacred black thread was received in a beautifully sealed package.",
    rating: 5,
    badge: "Prasad & Thread Delivered",
    date: "April 2026",
    avatarSeed: "vikram",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "t5",
    name: "Sandeep Patnaik",
    location: "Cuttack, Odisha",
    serviceName: "Puri Jagannath Mahaprasad Seva",
    story: "Sri Dwar made it incredibly easy to sponsor Chhappan Bhog at Puri on my daughter's birthday. We watched the live streams of the pandas carrying the holy pots. Our sanctified Prasad package containing the dry Nirmalya reached our doorstep in Cuttack with pristine packing. A truly divine blessing!",
    rating: 5,
    badge: "Authentic Dry Prasad Received",
    date: "June 2026",
    avatarSeed: "sandeep",
    avatarUrl: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "t6",
    name: "Rajeshwari Deshmukh",
    location: "Pune, Maharashtra",
    serviceName: "Maa Kamakhya Tantrik Archana",
    story: "Faced severe obstacles in life, blockages seemed endless. Sponsoring Maa Kamakhya's Tantrik Archana with Sri Dwar felt extremely sacred. Listening to the priest recite my Gotra over the water spring in Nilachal hills was deeply moving. Receival of the blessed vermilion and red thread brought a miraculous shift in my daily peace.",
    rating: 5,
    badge: "Maa Kamakhya Blessings Received",
    date: "June 2026",
    avatarSeed: "rajeshwari",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "t7",
    name: "Dr. Amit Varma",
    location: "Chicago, USA",
    serviceName: "Ayodhya Gausala Seva Ritual",
    story: "Living thousands of miles away in Chicago, I always wanted to contribute to the sacred cows in Ayodhya. With Sri Dwar, I was able to sponsor food and fodder seamlessly. Within 24 hours, the team shared verified photos and live clip links showing fresh green grass delivered to Go-Mata. Deeply transparency-oriented governance!",
    rating: 5,
    badge: "Live Feed Evidence Received",
    date: "May 2026",
    avatarSeed: "amit",
    avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150"
  }
];

export default function DevoteeExperiences() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newService, setNewService] = useState("");
  const [newStory, setNewStory] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  // Load from localStorage or defaults
  useEffect(() => {
    const saved = localStorage.getItem("sridwar_devotee_reviews");
    if (saved) {
      try {
        setTestimonials(JSON.parse(saved));
      } catch (e) {
        setTestimonials(DEFAULT_TESTIMONIALS);
      }
    } else {
      setTestimonials(DEFAULT_TESTIMONIALS);
    }
  }, []);

  const saveTestimonials = (items: Testimonial[]) => {
    setTestimonials(items);
    localStorage.setItem("sridwar_devotee_reviews", JSON.stringify(items));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName || !newLocation || !newService || !newStory) return;

    // ✅ Sync to Google Forms first
    try {
      await syncToGoogleForm("prasad_testimony", {
        name: newName,
        email: newLocation,   // location goes into email field (entry.1921900509)
        phone: newService,    // service goes into phone field (entry.151571055)
        details: newStory,
        type: String(newRating)
      });
    } catch (err) {
      console.error("Testimony sync error:", err);
    }

    const newReview: Testimonial = {
      id: "review_" + Date.now(),
      name: newName,
      location: newLocation,
      serviceName: newService,
      story: newStory,
      rating: newRating,
      badge: "Verified Devotee Experience",
      date: "Received Today",
      avatarSeed: newName.toLowerCase().replace(/\s+/g, "")
    };

    const updated = [newReview, ...testimonials];
    saveTestimonials(updated);
    setIsSubmitSuccess(true);
    setCurrentIndex(0); // Show the new experience first

    // Reset form
    setTimeout(() => {
      setNewName("");
      setNewLocation("");
      setNewService("");
      setNewStory("");
      setNewRating(5);
      setIsSubmitSuccess(false);
      setIsModalOpen(false);
    }, 2000);
  };

  if (testimonials.length === 0) return null;

  const currentDevotee = testimonials[currentIndex];

  return (
    <section id="devotee-experiences-section" className="relative py-16 bg-gradient-to-b from-[#021816] to-[#042825] border-t border-white/10 overflow-hidden">
      {/* Sacred background patterns */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-1/2 left-1/4 w-80 h-80 rounded-full bg-[#FFB347] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#5EEAD4] blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        
        {/* Header styling */}
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <Users className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span className="text-[10px] font-mono tracking-widest text-[#FFB347] uppercase font-bold">
              Devotee Experiences
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white tracking-tight">
            Divine Miracles & Success Stories
          </h2>
          <p className="text-xs md:text-sm text-white/70 max-w-xl mx-auto">
            Witness the sacred testimonies of global devotees who connected with their roots, experienced holy resolution, and received authenticated prasadam.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-4xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#062421]/90 rounded-3xl border border-white/10 p-6 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
            
            {/* Spiritual symbol decoration */}
            <div className="absolute top-4 right-6 text-white/5 font-serif text-8xl pointer-events-none select-none">
              ॐ
            </div>

            {/* Left Column: Avatar & Service Details */}
            <div className="md:col-span-4 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-8">
              {/* Profile Avatar icon placeholder representation */}
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 border-[#FFB347]/30 shadow-lg relative overflow-hidden bg-[#021816]">
                {currentDevotee.avatarUrl ? (
                  <img
                    src={currentDevotee.avatarUrl}
                    alt={currentDevotee.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-3xl font-serif font-black uppercase text-[#FFB347]">
                    {currentDevotee.name.charAt(0)}
                  </span>
                )}
                {/* Small heart/star badge details */}
                <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full p-1 border border-[#062421] shadow z-10">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
              </div>

              <h4 className="font-serif text-xl font-bold text-white tracking-tight">{currentDevotee.name}</h4>
              <div className="flex items-center text-white/50 text-xs mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#5EEAD4] mr-1" />
                {currentDevotee.location}
              </div>

              {/* Service Tag */}
              <div className="mt-4 px-3 py-1.5 rounded-xl bg-teal-950/80 border border-[#5EEAD4]/20 text-[11px] font-sans font-bold text-[#5EEAD4] tracking-wide uppercase">
                {currentDevotee.serviceName}
              </div>
              
              <div className="text-[10px] text-white/40 font-mono mt-2">{currentDevotee.date}</div>
            </div>

            {/* Right Column: Quote & Story */}
            <div className="md:col-span-8 flex flex-col justify-between py-2 pl-0 md:pl-4 min-h-[220px]">
              <div>
                {/* Trust Stars */}
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < currentDevotee.rating ? "text-[#FFB347] fill-[#FFB347]" : "text-white/20"}`} 
                    />
                  ))}
                  <span className="text-xs text-white/50 font-mono pl-1">({currentDevotee.rating}.0)</span>
                </div>

                {/* Quote details */}
                <div className="relative">
                  <span className="absolute -top-6 -left-3 text-white/10 font-serif text-7xl select-none">“</span>
                  <p className="text-sm md:text-base text-white/80 italic leading-relaxed relative z-10 pl-2">
                    {currentDevotee.story}
                  </p>
                </div>
              </div>

              {/* Bottom Stamp Badges */}
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-2 bg-emerald-950/40 border border-emerald-500/20 rounded-lg px-2.5 py-1 text-emerald-400 text-xs font-bold font-sans">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{currentDevotee.badge}</span>
                </div>

                {/* Sri Dwar Digital signature guarantee stamp text */}
                <div className="text-[10px] font-mono tracking-widest text-[#FFB347]/70 uppercase flex items-center space-x-1">
                  <span>Sri Dwar Certified Sync</span>
                </div>
              </div>

            </div>

          </div>

          {/* Nav Controls */}
          <div className="flex items-center justify-between mt-6">
            <button
              id="devotee-carousel-prev"
              onClick={handlePrev}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer shadow hover:text-[#5EEAD4]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Pagination indicators dots */}
            <div className="flex items-center space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "w-6 bg-[#FFB347]" : "w-2 bg-white/20 hover:bg-white/40"}`}
                  title={`Go to story ${index + 1}`}
                />
              ))}
            </div>

            <button
              id="devotee-carousel-next"
              onClick={handleNext}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer shadow hover:text-[#5EEAD4]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Action Button: Share Testimonial */}
        <div className="mt-12 text-center" id="devotee-experiences-action">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FFB347] to-[#e08e2f] text-[#021816] font-bold text-sm tracking-wide shadow-xl hover:opacity-95 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Feather className="w-4 h-4" />
            <span>Share Your Devotion Story</span>
          </button>
        </div>

      </div>

      {/* Share Testimonial Overlay Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#042825] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              {/* Gold border top accent */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#5EEAD4] via-[#FFB347] to-[#5EEAD4]" />
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-center mb-2">
                <SriDwarLogo variant="colored" iconSize="sm" showTagline={false} />
              </div>

              <h3 className="font-serif text-2xl font-bold text-white text-center pb-1">
                Share Prasad & Prayer Testimony
              </h3>
              <p className="text-xs text-white/60 text-center max-w-sm mx-auto mb-6">
                Tell other devotees about the blessings, grace, or sacred resolution you felt. Every story builds faith.
              </p>

              {isSubmitSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif text-xl font-bold text-[#5EEAD4]">Sankalpa Review Submitted!</h4>
                  <p className="text-xs text-white/70 max-w-xs mx-auto">
                    Thank you for sharing your spiritual testimony. Your story has been added and synchronized securely to your browser storage.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4 text-left">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1.5">Your Name</label>
                      <input 
                        required
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Ramesh Patel"
                        className="w-full bg-[#021816]/80 text-white border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#5EEAD4] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1.5">Devotee Location</label>
                      <input 
                        required
                        type="text" 
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="e.g. Ahmedabad, Gujarat"
                        className="w-full bg-[#021816]/80 text-white border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#5EEAD4] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1.5">Spiritual Seva or Puja Availed</label>
                    <input 
                      required
                      type="text" 
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      placeholder="e.g. Somnath Mahadev Sankalpa Puja"
                      className="w-full bg-[#021816]/80 text-white border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#5EEAD4] transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-bold text-white/70 uppercase tracking-widest">Devotion Rating</label>
                      <span className="text-[10px] font-mono text-[#FFB347] font-bold">{newRating} Star Gratitude</span>
                    </div>
                    <div className="flex space-x-2 bg-[#021816]/50 p-2 rounded-xl border border-white/5 w-fit">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="hover:scale-110 transition-transform p-0.5"
                        >
                          <Star className={`w-6 h-6 ${star <= newRating ? "text-[#FFB347] fill-[#FFB347]" : "text-white/20"}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1.5">Your Experience / Miraculous Story</label>
                    <textarea 
                      required
                      rows={4}
                      value={newStory}
                      onChange={(e) => setNewStory(e.target.value)}
                      placeholder="Describe the peaceful transition, positive energetic shift, or receipt of prasad you experienced after completing the rituals..."
                      className="w-full bg-[#021816]/80 text-white border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-[#5EEAD4] transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* Submission agreement check */}
                  <div className="flex items-start space-x-2 text-[10px] text-white/60">
                    <input type="checkbox" required defaultChecked className="mt-0.5" />
                    <span>I permit Sridwar parameters to broadcast this testimony to other seekers.</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5EEAD4] to-[#2dd4bf] text-[#021816] font-bold text-xs tracking-widest uppercase shadow-lg hover:opacity-95 transition-opacity mt-4 cursor-pointer"
                  >
                    Transmit Review Securely
                  </button>

                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
