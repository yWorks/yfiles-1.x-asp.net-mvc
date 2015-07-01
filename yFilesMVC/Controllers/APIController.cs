using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace yFilesMVC.Controllers
{
	public class Person
	{
		public int Id { get; set; }

		public string FirstName { get; set; }

		public string LastName { get; set; }
	}

	public class PersonAddress
	{
		

		public string AddressLine { get; set; }

		public string Zip { get; set; }

		public string City { get; set; }

		public string Country { get; set; }
	}

	public class PersonHierarchy
	{

		public List<Person> Nodes { get; set; }

		public List<Link> Links { get; set; }

		public PersonHierarchy()
		{
			this.Nodes = new List<Person>();
			this.Links = new List<Link>();
		}
	}

	public class Link
	{
		public int From { get; set; }

		public int To { get; set; }
	}

	public class APIController : ApiController
	{
		static class Cache
		{
			static Dictionary<int, Tuple<Person, PersonAddress>> cache = new Dictionary<int, Tuple<Person, PersonAddress>>();

			static void AddPerson(int id)
			{
				var person = new Person {
					Id = id,
					FirstName = Faker.Name.First(),
					LastName = Faker.Name.Last()
				};
				var personAddress = new PersonAddress {
					AddressLine = Faker.Address.StreetAddress(),
					City = Faker.Address.City(),
					Zip = Faker.Address.ZipCode(),
					Country = Faker.Address.Country()
				};
				cache.Add(id, Tuple.Create(person, personAddress));
			}

			public static Person GetPerson(int id)
			{
				if(!cache.ContainsKey(id)) {
					AddPerson(id);
				}
				return cache[id].Item1;
			}

			public static PersonAddress GetPersonAddress(int id)
			{
				if(!cache.ContainsKey(id)) {
					AddPerson(id);
				}
				return cache[id].Item2;
			}

		}

		static Random Rand = new Random(Environment.TickCount);

		[HttpGet]
		[Route("API/GetRoot")]
		public Person GetRoot()
		{
			return Cache.GetPerson(0);
		}

		[HttpGet]
		[Route("API/GetPerson/{id}")]
		public Person GetPerson(int id)
		{
			return Cache.GetPerson(id);
		}

		[HttpGet]
		[Route("API/GetPersonAddress/{id}")]
		public PersonAddress GetPersonAddress(int id)
		{
			return Cache.GetPersonAddress(id);
		}

		[HttpGet]
		[Route("API/GetHierarchy/{id}/{count?}/{degree?}")]
		public PersonHierarchy GetHierarchy(int id, int count = 20, int degree = 3)
		{
			// let's keep it tidy shall we?
			degree = Math.Max(1, Math.Min(5, degree));
			var hierarchy = new PersonHierarchy();
			// make sure the root is already in the collection
			hierarchy.Nodes.Add(Cache.GetPerson(0));
			var parentId = 0;
			// keep track of the node degrees
			var degrees = new Dictionary<int,int>{ { 0,0 } };

			for(int i = 1; i < count; i++) {
				parentId = Rand.Next(hierarchy.Nodes.Count);
				while(degrees[parentId] >= degree)
					parentId = Rand.Next(hierarchy.Nodes.Count);

				hierarchy.Links.Add(new Link{ From = parentId, To = i });
				// include the new node
				hierarchy.Nodes.Add(Cache.GetPerson(i));
				// upstate the stats
				degrees.Add(i, 0);
				degrees[parentId] = degrees[parentId] + 1;
			}
			return hierarchy;
		}
	}
}
