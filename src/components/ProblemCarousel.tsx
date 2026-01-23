import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Bot, Clock, Handshake } from "lucide-react";

const slides = [
  {
    id: 1,
    icon: Bot,
    title: "The AI Crisis",
    description: "AI bots ingest your data for free, training on your content without permission or compensation. Your intellectual property becomes their profit.",
    accent: "destructive",
  },
  {
    id: 2,
    icon: Clock,
    title: "The Legacy Friction",
    description: "Outdated human licensing systems like CCC are too slow for 2026. Complex contracts and delayed payments stifle creator growth.",
    accent: "warning",
  },
  {
    id: 3,
    icon: Handshake,
    title: "The Opedd Solution",
    description: "A unified handshake for both humans and AI. Frictionless licensing, instant payments, and complete sovereignty over your content.",
    accent: "primary",
  },
];

const ProblemCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const currentSlideData = slides[currentSlide];
  const Icon = currentSlideData.icon;

  return (
    <section id="how-it-works" className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-oxford text-sm font-semibold uppercase tracking-wider">
            The Problem
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-soft-white mt-4">
            Content Licensing is Broken
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Carousel Navigation */}
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 z-10 w-12 h-12 rounded-full glass-card flex items-center justify-center text-soft-white hover:text-accent transition-colors hover-glow"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 z-10 w-12 h-12 rounded-full glass-card flex items-center justify-center text-soft-white hover:text-accent transition-colors hover-glow"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Slide Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="glass-card p-8 lg:p-12 text-center hover-glow"
              >
                <div
                  className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center ${
                    currentSlideData.accent === "destructive"
                      ? "bg-destructive/20"
                      : currentSlideData.accent === "warning"
                      ? "bg-amber-500/20"
                      : "bg-oxford/20"
                  }`}
                >
                  <Icon
                    className={`w-10 h-10 ${
                      currentSlideData.accent === "destructive"
                        ? "text-destructive"
                        : currentSlideData.accent === "warning"
                        ? "text-amber-500"
                        : "text-oxford"
                    }`}
                  />
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-soft-white mb-4">
                  {currentSlideData.title}
                </h3>
                <p className="text-lg text-alice-gray max-w-2xl mx-auto leading-relaxed">
                  {currentSlideData.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Slide Indicators */}
            <div className="flex items-center justify-center gap-3 mt-8">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "w-8 bg-oxford"
                      : "w-2 bg-muted hover:bg-alice-gray"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemCarousel;