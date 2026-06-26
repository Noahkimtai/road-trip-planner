export interface Car {
  id: string;
  make: string;
  model: string;
  year: string;
  mpg: number;
  type:
    | "sedan"
    | "suv"
    | "truck"
    | "hatchback"
    | "coupe"
    | "hybrid"
    | "electric";
}

export const cars: Car[] = [
  // Popular Sedans
  {
    id: "toyota-camry-2024",
    make: "Toyota",
    model: "Camry",
    year: "2024",
    mpg: 32,
    type: "sedan",
  },
  {
    id: "honda-accord-2024",
    make: "Honda",
    model: "Accord",
    year: "2024",
    mpg: 33,
    type: "sedan",
  },
  {
    id: "nissan-altima-2024",
    make: "Nissan",
    model: "Altima",
    year: "2024",
    mpg: 31,
    type: "sedan",
  },
  {
    id: "hyundai-sonata-2024",
    make: "Hyundai",
    model: "Sonata",
    year: "2024",
    mpg: 33,
    type: "sedan",
  },
  {
    id: "kia-k5-2024",
    make: "Kia",
    model: "K5",
    year: "2024",
    mpg: 31,
    type: "sedan",
  },

  // Popular SUVs
  {
    id: "toyota-rav4-2024",
    make: "Toyota",
    model: "RAV4",
    year: "2024",
    mpg: 28,
    type: "suv",
  },
  {
    id: "honda-crv-2024",
    make: "Honda",
    model: "CR-V",
    year: "2024",
    mpg: 31,
    type: "suv",
  },
  {
    id: "mazda-cx5-2024",
    make: "Mazda",
    model: "CX-5",
    year: "2024",
    mpg: 26,
    type: "suv",
  },
  {
    id: "subaru-outback-2024",
    make: "Subaru",
    model: "Outback",
    year: "2024",
    mpg: 29,
    type: "suv",
  },
  {
    id: "jeep-wrangler-2024",
    make: "Jeep",
    model: "Wrangler",
    year: "2024",
    mpg: 22,
    type: "suv",
  },
  {
    id: "ford-explorer-2024",
    make: "Ford",
    model: "Explorer",
    year: "2024",
    mpg: 24,
    type: "suv",
  },
  {
    id: "chevrolet-tahoe-2024",
    make: "Chevrolet",
    model: "Tahoe",
    year: "2024",
    mpg: 20,
    type: "suv",
  },

  // Popular Trucks
  {
    id: "ford-f150-2024",
    make: "Ford",
    model: "F-150",
    year: "2024",
    mpg: 22,
    type: "truck",
  },
  {
    id: "chevrolet-silverado-2024",
    make: "Chevrolet",
    model: "Silverado",
    year: "2024",
    mpg: 21,
    type: "truck",
  },
  {
    id: "ram-1500-2024",
    make: "Ram",
    model: "1500",
    year: "2024",
    mpg: 22,
    type: "truck",
  },
  {
    id: "toyota-tacoma-2024",
    make: "Toyota",
    model: "Tacoma",
    year: "2024",
    mpg: 24,
    type: "truck",
  },
  {
    id: "honda-ridgeline-2024",
    make: "Honda",
    model: "Ridgeline",
    year: "2024",
    mpg: 23,
    type: "truck",
  },

  // Hatchbacks & Compacts
  {
    id: "honda-civic-2024",
    make: "Honda",
    model: "Civic Hatchback",
    year: "2024",
    mpg: 35,
    type: "hatchback",
  },
  {
    id: "toyota-corolla-2024",
    make: "Toyota",
    model: "Corolla",
    year: "2024",
    mpg: 34,
    type: "sedan",
  },
  {
    id: "nissan-sentra-2024",
    make: "Nissan",
    model: "Sentra",
    year: "2024",
    mpg: 33,
    type: "sedan",
  },
  {
    id: "volkswagen-jetta-2024",
    make: "Volkswagen",
    model: "Jetta",
    year: "2024",
    mpg: 31,
    type: "sedan",
  },
  {
    id: "subaru-impreza-2024",
    make: "Subaru",
    model: "Impreza",
    year: "2024",
    mpg: 31,
    type: "hatchback",
  },

  // Luxury Cars
  {
    id: "bmw-3series-2024",
    make: "BMW",
    model: "3 Series",
    year: "2024",
    mpg: 28,
    type: "sedan",
  },
  {
    id: "mercedes-c300-2024",
    make: "Mercedes-Benz",
    model: "C-Class",
    year: "2024",
    mpg: 29,
    type: "sedan",
  },
  {
    id: "audi-a4-2024",
    make: "Audi",
    model: "A4",
    year: "2024",
    mpg: 27,
    type: "sedan",
  },
  {
    id: "lexus-es-2024",
    make: "Lexus",
    model: "ES",
    year: "2024",
    mpg: 31,
    type: "sedan",
  },

  // Hybrids
  {
    id: "toyota-prius-2024",
    make: "Toyota",
    model: "Prius",
    year: "2024",
    mpg: 54,
    type: "hybrid",
  },
  {
    id: "honda-insight-2024",
    make: "Honda",
    model: "Insight",
    year: "2024",
    mpg: 52,
    type: "hybrid",
  },
  {
    id: "toyota-camry-hybrid-2024",
    make: "Toyota",
    model: "Camry Hybrid",
    year: "2024",
    mpg: 48,
    type: "hybrid",
  },
  {
    id: "honda-accord-hybrid-2024",
    make: "Honda",
    model: "Accord Hybrid",
    year: "2024",
    mpg: 47,
    type: "hybrid",
  },
  {
    id: "toyota-rav4-hybrid-2024",
    make: "Toyota",
    model: "RAV4 Hybrid",
    year: "2024",
    mpg: 40,
    type: "hybrid",
  },

  // Electric (using MPGe equivalent for calculation)
  {
    id: "tesla-model3-2024",
    make: "Tesla",
    model: "Model 3",
    year: "2024",
    mpg: 120,
    type: "electric",
  },
  {
    id: "tesla-modely-2024",
    make: "Tesla",
    model: "Model Y",
    year: "2024",
    mpg: 110,
    type: "electric",
  },
  {
    id: "nissan-leaf-2024",
    make: "Nissan",
    model: "Leaf",
    year: "2024",
    mpg: 108,
    type: "electric",
  },
  {
    id: "chevrolet-bolt-2024",
    make: "Chevrolet",
    model: "Bolt EV",
    year: "2024",
    mpg: 115,
    type: "electric",
  },

  // Sports Cars
  {
    id: "ford-mustang-2024",
    make: "Ford",
    model: "Mustang",
    year: "2024",
    mpg: 23,
    type: "coupe",
  },
  {
    id: "chevrolet-camaro-2024",
    make: "Chevrolet",
    model: "Camaro",
    year: "2024",
    mpg: 22,
    type: "coupe",
  },
  {
    id: "dodge-challenger-2024",
    make: "Dodge",
    model: "Challenger",
    year: "2024",
    mpg: 21,
    type: "coupe",
  },

  // Custom option for manual entry
  {
    id: "custom",
    make: "Custom",
    model: "Enter MPG manually",
    year: "",
    mpg: 25,
    type: "sedan",
  },
];

export const getCarsByType = (type: Car["type"]) => {
  return cars.filter((car) => car.type === type && car.id !== "custom");
};

export const getCarById = (id: string) => {
  return cars.find((car) => car.id === id);
};

export const formatCarName = (car: Car) => {
  if (car.id === "custom") {
    return car.model;
  }
  return `${car.make} ${car.model} ${car.year ? `(${car.year})` : ""} - ${
    car.mpg
  } MPG`;
};
