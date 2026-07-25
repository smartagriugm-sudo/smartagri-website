// Student roster for the /team page: name, class year (angkatan), and level.
// Listed as a simple grouped list (by year, then level), not profile cards.
// TODO: 2023 undergraduate names are still being collected by the team.

export type StudentLevel = "Undergraduate" | "Postgraduate" | "Doctoral";

export type Student = { name: string; year: number; level: StudentLevel };

const U: StudentLevel = "Undergraduate";
const P: StudentLevel = "Postgraduate";
const D: StudentLevel = "Doctoral";

export const STUDENTS: Student[] = [
  // 2012
  { name: "Ardhito Arsyan", year: 2012, level: U },
  // 2013
  { name: "Is Widya Rahmawati", year: 2013, level: U },
  { name: "Mayang Iskandar", year: 2013, level: U },
  { name: "Adetya Raya Putra", year: 2013, level: U },
  { name: "Dita Endah Rahayu", year: 2013, level: U },
  { name: "Lukman Hanif Rifai", year: 2013, level: U },
  { name: "Astriati Hamidah", year: 2013, level: U },
  { name: "M. Hafizh Jabbar", year: 2013, level: U },
  // 2014
  { name: "Bimo Sandi Pratidina", year: 2014, level: U },
  { name: "Zaidan Alif Muttaqin", year: 2014, level: U },
  { name: "Fauzan Edy Wijaya", year: 2014, level: U },
  { name: "Arifin Widiyatmoko", year: 2014, level: U },
  { name: "Abiyyu Irfan", year: 2014, level: U },
  { name: "Shadiq Muhammad Shalih", year: 2014, level: U },
  // 2015
  { name: "Anugrah Tiar Pratama", year: 2015, level: U },
  { name: "Kevin Nigel Pradika Putra", year: 2015, level: U },
  { name: "Anjar Firmansyah", year: 2015, level: U },
  { name: "Soleh Hidayat", year: 2015, level: U },
  { name: "Bagus Prayogo", year: 2015, level: U },
  { name: "Audi Wibisiono", year: 2015, level: U },
  { name: "Ghagas Pamungkas Edwantiar", year: 2015, level: U },
  { name: "Mohammad Faizal Alim", year: 2015, level: U },
  { name: "Diodona Maenggartama", year: 2015, level: U },
  { name: "Ahmad Kariel Jude", year: 2015, level: U },
  { name: "Dwi Wiyantanu", year: 2015, level: U },
  { name: "Muamar Arif Khuluqi", year: 2015, level: U },
  { name: "Muhammad Arif Nuridho", year: 2015, level: U },
  // 2016
  { name: "Aulia Rizkiana", year: 2016, level: U },
  { name: "Anggit Wijanarko", year: 2016, level: U },
  { name: "Siti Maghfiroh", year: 2016, level: U },
  { name: "Dian Fatmawati", year: 2016, level: U },
  { name: "Muhammad Akbar Andi Arief", year: 2016, level: U },
  { name: "Sumardo Purba", year: 2016, level: U },
  { name: "Yoga Bagus Pratomo", year: 2016, level: U },
  { name: "Yovie Risandy Kaito", year: 2016, level: U },
  { name: "Dewa Ngakan Mahadikara", year: 2016, level: U },
  { name: "Lukas Wiku Kuswidiyanto", year: 2016, level: U },
  { name: "Ruldy Murfid Nasrul", year: 2016, level: U },
  // 2017
  { name: "Ardan Wiratmoko", year: 2017, level: U },
  { name: "Ardyan Widyanto Putro", year: 2017, level: U },
  { name: "Diaz Habib Dananta", year: 2017, level: U },
  { name: "Gabriel Dida Saputra", year: 2017, level: U },
  { name: "Rega Arya Piradiansyah", year: 2017, level: U },
  { name: "Siwi Yuwanita", year: 2017, level: U },
  { name: "Rio Hatta Prayogi", year: 2017, level: U },
  // 2018
  { name: "Muhammad Athala Fawwaz Dzaky", year: 2018, level: U },
  { name: "Nabila Salma", year: 2018, level: U },
  { name: "Daffa Afnan", year: 2018, level: U },
  { name: "Yusuf Arapenta Rasbangun", year: 2018, level: U },
  { name: "Damar Seto Wicaksono", year: 2018, level: U },
  { name: "Ilham Muhammad Ridho", year: 2018, level: U },
  { name: "Raditya Suwardana", year: 2018, level: U },
  // 2019
  { name: "Rido Saputra", year: 2019, level: P },
  { name: "Muhammad Salman Ibnu Chaer", year: 2019, level: P },
  { name: "Nada Berliana Kusumawati", year: 2019, level: U },
  { name: "Widya Hafidzah Handayani", year: 2019, level: U },
  { name: "Kanaya Nisa Az Zahra", year: 2019, level: U },
  { name: "Hedwigis Nasia Meirieta", year: 2019, level: U },
  { name: "Muhammad Allam Daffa", year: 2019, level: U },
  { name: "Bernadetha Grace Wisdayanti", year: 2019, level: U },
  { name: "Arif Rakhman Charis", year: 2019, level: U },
  { name: "Shinta Wardani", year: 2019, level: U },
  { name: "Riska Amalia Abrianti", year: 2019, level: U },
  { name: "Mario Felix Silalahi", year: 2019, level: U },
  { name: "Rizky Dian Ramadhan", year: 2019, level: U },
  { name: "Fathuzaky Setiawan", year: 2019, level: U },
  { name: "Ridfi Anandta", year: 2019, level: U },
  { name: "Malyasandi Firdaus", year: 2019, level: U },
  { name: "Ardan Jaenuri", year: 2019, level: U },
  // 2020
  { name: "Muhdan Syarovy", year: 2020, level: P },
  { name: "Dwiki Nugraha", year: 2020, level: U },
  { name: "Samuel Gatot Marseno", year: 2020, level: U },
  { name: "Muhammad Farhan Hidayat", year: 2020, level: U },
  { name: "Ulfa Dwi Oktasari", year: 2020, level: U },
  { name: "Adiasa Rangga Farrasta", year: 2020, level: U },
  { name: "Fahmi Aryo Majid", year: 2020, level: U },
  { name: "Syukur Rahmatullah", year: 2020, level: U },
  { name: "Naufal Helmi Yumnanda", year: 2020, level: U },
  // 2021
  { name: "Mukhes Sri Muna", year: 2021, level: P },
  { name: "Ardan Wiratmoko", year: 2021, level: P },
  { name: "Hafidz Ebril Perdana", year: 2021, level: U },
  { name: "Zuhrotul Maulidah", year: 2021, level: U },
  { name: "Fransiskus Asisi Aditya Nico Christian", year: 2021, level: U },
  { name: "Ririn Febri Kusuma Wardani", year: 2021, level: U },
  { name: "Hanif Nur Wahid", year: 2021, level: U },
  { name: "Mumtaz Hatta Niha'i Sipayung", year: 2021, level: U },
  { name: "Ania Emilia Dewi", year: 2021, level: U },
  { name: "Diena Ita'ul Mufida", year: 2021, level: U },
  { name: "Fahmi Arsyad", year: 2021, level: U },
  { name: "Kevin Ezekiel Manik", year: 2021, level: U },
  // 2022
  { name: "Iva Khairunnisa", year: 2022, level: U },
  { name: "Muhammad Fajar Ridho Ilham", year: 2022, level: U },
  { name: "Aisyah Ramadhani", year: 2022, level: U },
  { name: "Zakha Wardana", year: 2022, level: U },
  { name: "Ilham Mubarok", year: 2022, level: U },
  { name: "Devi Ramdani", year: 2022, level: U },
  { name: "Bagus Dwi Putra Atmaja", year: 2022, level: U },
  { name: "Arinda Fadea Pramaesela", year: 2022, level: U },
  { name: "Zhorif Maulana Wirawan", year: 2022, level: U },
  { name: "Les' Aullian Achmad Argito", year: 2022, level: U },
  { name: "Briliyan Hartanti", year: 2022, level: U },
  { name: "Faiz Ridwan Pratama", year: 2022, level: U },
  { name: "Shidqon Fathul Muqorrobin", year: 2022, level: U },
  { name: "Ardan Desta Vaunendra", year: 2022, level: U },
  { name: "Muhammad Ilham Al Marda", year: 2022, level: U },
  { name: "Rizqi Asy'ari Ramadhan", year: 2022, level: U },
  { name: "Fajrian Anggit Hidayatulloh", year: 2022, level: U },
  // 2023
  { name: "Saifuddin Afif", year: 2023, level: P },
  { name: "Muhammad Furqon Al-Ashry", year: 2023, level: U },
  { name: "Prima Hastiawan", year: 2023, level: U },
  { name: "Muchammad Zidan Rachman", year: 2023, level: U },
  { name: "Antacena Larrum Mahardika", year: 2023, level: U },
  { name: "Michael Carlo Wicaksono", year: 2023, level: U },
  { name: "Adimas Dwi Prabowo", year: 2023, level: U },
  { name: "Achmad Tijani", year: 2023, level: U },
  // 2024
  { name: "Saifuddin Afif", year: 2024, level: D },
  { name: "Andi Setiawan", year: 2024, level: D },
  { name: "Hammam Mananda Harahap", year: 2024, level: P },
  { name: "Arifa Haryani", year: 2024, level: P },
  { name: "Muhammad Athala Fawwaz Dzaky", year: 2024, level: P },
  // 2025
  { name: "Cahyo Putro Dwi Nugroho", year: 2025, level: P },
  { name: "Widi Kuntara Muladi Putra", year: 2025, level: P },
];

const LEVEL_ORDER: StudentLevel[] = ["Doctoral", "Postgraduate", "Undergraduate"];

/** Students grouped by year (ascending), then by level within each year. */
export function studentGroups(): {
  year: number;
  count: number;
  groups: { level: StudentLevel; names: string[] }[];
}[] {
  const byYear = new Map<number, Student[]>();
  for (const s of STUDENTS) {
    const list = byYear.get(s.year);
    if (list) list.push(s);
    else byYear.set(s.year, [s]);
  }
  return [...byYear.keys()]
    .sort((a, b) => a - b)
    .map((year) => {
      const items = byYear.get(year)!;
      const groups = LEVEL_ORDER.map((level) => ({
        level,
        names: items.filter((i) => i.level === level).map((i) => i.name),
      })).filter((g) => g.names.length > 0);
      return { year, count: items.length, groups };
    });
}
