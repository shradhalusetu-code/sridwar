/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
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
import UPIPaymentModal from "./UPIPaymentModal";
import { validateName, validateTextMinLength } from "../utils/formValidation";

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
    badge: "Example Story",
    date: "June 2026",
    avatarSeed: "rohan",
  },
  {
    id: "t2",
    name: "Ananya Iyer",
    location: "Bengaluru",
    serviceName: "Vighnaharta Ganesha Success Puja",
    story: "Before launching our technology venture, we registered for the special Ganesha Sankalpa. The transparency was immaculate—real temple receipts, the chief shastri's digital seal on our certificate, and real-time aarti. We signed our first institutional partner last week! Grateful to Sri Dwar.",
    rating: 5,
    badge: "Example Story",
    date: "May 2026",
    avatarSeed: "ananya",
  },
  {
    id: "t3",
    name: "Meera Nair",
    location: "Ernakulam",
    serviceName: "Sanskrit Gurukul Book Kit Seva",
    story: "I wanted to sponsor traditional education for my mother's birthday. Through the temple seva portal, I gifted Sanskrit books to young students. Sri Dwar shared actual photographs of children holding the exact kits stamped with the Gurukul seal. Deeply moving and transparent. Highly recommended!",
    rating: 5,
    badge: "Example Story",
    date: "June 2026",
    avatarSeed: "meera",
  },
  {
    id: "t4",
    name: "Vikram Aditya",
    location: "Mumbai",
    serviceName: "Shani Dev Malefic Relief Puja",
    story: "The transit of Saturn was bringing immense struggles in my profession. Initiating the special Saturday Shani-Taila Abhishekam through Sri Dwar brought high tranquil vibes. The live audio streaming was pristine, and the sacred black thread was received in a beautifully sealed package.",
    rating: 5,
    badge: "Example Story",
    date: "April 2026",
    avatarSeed: "vikram",
  },
  {
    id: "t5",
    name: "Sandeep Patnaik",
    location: "Cuttack, Odisha",
    serviceName: "Puri Jagannath Mahaprasad Seva",
    story: "Sri Dwar made it incredibly easy to sponsor Chhappan Bhog at Puri on my daughter's birthday. We watched the live streams of the pandas carrying the holy pots. Our sanctified Prasad package containing the dry Nirmalya reached our doorstep in Cuttack with pristine packing. A truly divine blessing!",
    rating: 5,
    badge: "Example Story",
    date: "June 2026",
    avatarSeed: "sandeep",
  },
  {
    id: "t6",
    name: "Rajeshwari Deshmukh",
    location: "Pune, Maharashtra",
    serviceName: "Maa Kamakhya Tantrik Archana",
    story: "Faced severe obstacles in life, blockages seemed endless. Sponsoring Maa Kamakhya's Tantrik Archana with Sri Dwar felt extremely sacred. Listening to the priest recite my Gotra over the water spring in Nilachal hills was deeply moving. Receival of the blessed vermilion and red thread brought a miraculous shift in my daily peace.",
    rating: 5,
    badge: "Example Story",
    date: "June 2026",
    avatarSeed: "rajeshwari",
  },
  {
    id: "t7",
    name: "Dr. Amit Varma",
    location: "Chicago, USA",
    serviceName: "Ayodhya Gausala Seva Ritual",
    story: "Living thousands of miles away in Chicago, I always wanted to contribute to the sacred cows in Ayodhya. With Sri Dwar, I was able to sponsor food and fodder seamlessly. Within 24 hours, the team shared photos and live clip links showing fresh green grass delivered to Go-Mata. Deeply transparency-oriented governance!",
    rating: 5,
    badge: "Example Story",
    date: "May 2026",
    avatarSeed: "amit",
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
  const [showUPI, setShowUPI] = useState(false);
  const [testimonyRefId, setTestimonyRefId] = useState("");

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

  // Modal closed without paying — sends the ONE Final row for this
  // testimony, sharing the same Ref ID, with the contribution correctly
  // recorded as "Skipped".
  const handleSkipContribution = async () => {
    setShowUPI(false);
    try {
      await syncToGoogleForm("prasad_testimony", {
        name: newName,
        email: newLocation,
        phone: newService,
        details: `${newStory} [Contribution: Skipped] [Ref: ${testimonyRefId}]`,
        type: String(newRating)
      });
    } catch (err) {
      console.error("Testimony sync error:", err);
    }
  };

  // Payment confirmed — sends the ONE Final row for this testimony, sharing
  // the same Ref ID, with the contribution correctly recorded as the real
  // amount + method paid.
  const handleContributionConfirmed = async (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    setShowUPI(false);
    try {
      await syncToGoogleForm("prasad_testimony", {
        name: newName,
        email: newLocation,
        phone: newService,
        details: `${newStory} [Contribution: ₹${details.amount} via ${details.method}] [Ref: ${testimonyRefId}]`,
        type: String(newRating)
      });
    } catch (err) {
      console.error("Testimony sync error:", err);
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();

    // ── Global validation ────────────────────────────────────────────────────
    const nameErr     = validateName(newName);
    const locationErr = validateTextMinLength(newLocation, "Location", 2);
    const serviceErr  = newService.trim() ? null : "Please select or name the service/puja received.";
    const storyErr    = validateTextMinLength(newStory, "Your testimony", 30);
    if (nameErr)     { alert(nameErr);     return; }
    if (locationErr) { alert(locationErr); return; }
    if (serviceErr)  { alert(serviceErr);  return; }
    if (storyErr)    { alert(storyErr);    return; }
    // ────────────────────────────────────────────────────────────────────────

    const newRef = "SDT-" + Math.floor(100000 + Math.random() * 900000);
    setTestimonyRefId(newRef);

    // ✅ Sync to Google Forms first — ONE row, with the optional thank-you
    // contribution correctly recorded as "Pending — Awaiting Decision" (not
    // silently omitted). If the devotee closes the UPI modal without
    // contributing, OR confirms a contribution, handleContributionConfirmed
    // / handleSkipContribution below send exactly ONE more row — same Ref
    // ID — with the real outcome.
    try {
      await syncToGoogleForm("prasad_testimony", {
        name: newName,
        email: newLocation,   // location goes into email field (entry.1921900509)
        phone: newService,    // service goes into phone field (entry.151571055)
        details: `${newStory} [Contribution: Pending — Awaiting Decision] [Ref: ${newRef}]`,
        type: String(newRating)
      });
    } catch (err) {
      console.error("Testimony sync error:", err);
    }

    // ✅ Show optional UPI contribution after testimony submission
    setShowUPI(true);

    const newReview: Testimonial = {
      id: "review_" + Date.now(),
      name: newName,
      location: newLocation,
      serviceName: newService,
      story: newStory,
      rating: newRating,
      badge: "Submitted by a Devotee",
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
    <section id="devotee-experiences-section" className="relative py-16 bg-gradient-to-b from-[#021816] to-[#042825] border-t border-white/10 overflow-hidden" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
      {/* Sacred background patterns */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-1/2 left-1/4 w-80 h-80 rounded-full bg-[#FFB347] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#5EEAD4] blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        
        {/* Header styling */}
        <div className="text-center space-y-2 mb-6">
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
            Real stories shared by devotees who used Sri Dwar, alongside example stories illustrating the kinds of experiences devotees have.
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
                  <span>Sri Dwar Confirmed Sync</span>
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
        <div className="mt-8 text-center" id="devotee-experiences-action">
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
      {isModalOpen && (
          <div
            id="share-story-modal"
            className="fixed inset-0 z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
            style={{ touchAction: "pan-y" }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          >
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <div
              className="relative w-full sm:max-w-lg bg-[#042825] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden animate-slideUp"
              style={{ maxHeight: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gold border top accent */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#5EEAD4] via-[#FFB347] to-[#5EEAD4] z-10" />
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 z-10"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrollable body — THE ONLY scroll container */}
              <div
                className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8"
                style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
              >
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
                <div className="py-12 text-center space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif text-xl font-bold text-[#5EEAD4]">Sankalpa Review Submitted!</h4>
                  <p className="text-xs text-white/70 max-w-xs mx-auto">
                    Thank you for sharing your spiritual testimony. Your story has been added and synchronized securely to your browser storage.
                  </p>
                </div>
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
                    <span>I agree Sri Dwar may review this testimony and feature it on this page for other devotees to read.</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5EEAD4] to-[#2dd4bf] text-[#021816] font-bold text-xs tracking-widest uppercase shadow-lg hover:opacity-95 transition-opacity mt-4 cursor-pointer"
                  >
                    Transmit Review Securely
                  </button>

                </form>
              )}
              </div>
            </div>
          </div>
      )}
      {/* Optional UPI contribution after testimony */}
      <UPIPaymentModal
        isOpen={showUPI}
        onClose={handleSkipContribution}
        onPaymentConfirmed={handleContributionConfirmed}
        amount={null}
        bookingName="Optional Contribution — Temple Support"
        devoteeName={newName}
        refId={testimonyRefId}
        allowCustomAmount={true}
        minAmount={5}
        maxAmount={1000}
      />
    </section>
  );
}
